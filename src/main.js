const form = document.querySelector("#feedback-form");
const filesInput = document.querySelector("#attachments");
const fileList = document.querySelector("#file-list");
const message = document.querySelector("#form-message");
const submitButton = document.querySelector("#submit-button");
const feedbackInput = document.querySelector("#feedback");
const charCount = document.querySelector("#char-count");

const MAX_FILES = 3;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "application/pdf"]);

function say(text, tone = "error") {
  message.textContent = text;
  message.className = `form-message is-visible ${tone}`;
}

function clearMessage() {
  message.textContent = "";
  message.className = "form-message";
}

function selectedFiles() {
  return [...(filesInput.files || [])];
}

function renderFiles() {
  const files = selectedFiles();
  fileList.replaceChildren();
  if (!files.length) return;

  for (const [index, file] of files.entries()) {
    const item = document.createElement("div");
    item.className = "file-chip";
    const icon = document.createElement("span");
    icon.className = "file-chip-icon";
    icon.textContent = file.type === "application/pdf" ? "PDF" : "IMG";
    const name = document.createElement("span");
    name.className = "file-chip-name";
    name.textContent = file.name;
    const size = document.createElement("span");
    size.className = "file-chip-size";
    size.textContent = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
    item.append(icon, name, size);
    fileList.append(item);
    if (index === 2) break;
  }
}

filesInput.addEventListener("change", () => {
  clearMessage();
  renderFiles();
  const files = selectedFiles();
  if (files.length > MAX_FILES) say("Please choose no more than 3 files.");
  else if (files.some((file) => !ALLOWED_TYPES.has(file.type))) say("One of those file types isn’t supported. Please use PNG, JPG, WEBP or PDF.");
  else if (files.some((file) => file.size > MAX_FILE_SIZE)) say("Each file must be 10 MB or smaller.");
});

feedbackInput.addEventListener("input", () => {
  charCount.textContent = `${feedbackInput.value.length.toLocaleString()} / 4,000`;
});

function config() {
  const settings = window.FEEDBACK_CONFIG || {};
  if (!settings.supabaseUrl || !settings.supabasePublishableKey) {
    throw new Error("This feedback form isn’t connected yet. Please check back soon.");
  }
  return {
    url: settings.supabaseUrl.replace(/\/$/, ""),
    key: settings.supabasePublishableKey,
  };
}

async function uploadFile(file, settings) {
  const safeName = file.name.normalize("NFKC").replace(/[^a-zA-Z0-9._-]/g, "-").slice(-100) || "attachment";
  const uniqueName = `${crypto.randomUUID()}-${safeName}`;
  const path = `submissions/${uniqueName}`;
  const response = await fetch(`${settings.url}/storage/v1/object/feedback-attachments/${path}`, {
    method: "POST",
    headers: {
      apikey: settings.key,
      Authorization: `Bearer ${settings.key}`,
      "Content-Type": file.type,
      "x-upsert": "false",
    },
    body: file,
  });
  if (!response.ok) {
    let details = "";
    try { details = (await response.json()).message || ""; } catch { /* keep generic upload error */ }
    throw new Error(details || `Couldn’t upload ${file.name}. Please try again.`);
  }
  return path;
}

async function sendFeedback(payload, settings) {
  const response = await fetch(`${settings.url}/rest/v1/product_feedback`, {
    method: "POST",
    headers: {
      apikey: settings.key,
      Authorization: `Bearer ${settings.key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    let details = "";
    try { details = (await response.json()).message || ""; } catch { /* keep generic submit error */ }
    throw new Error(details || "We couldn’t send your feedback. Please try again.");
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessage();

  if (form.elements.website.value) return;
  if (!form.reportValidity()) return;

  const files = selectedFiles();
  if (files.length > MAX_FILES || files.some((file) => !ALLOWED_TYPES.has(file.type) || file.size > MAX_FILE_SIZE)) {
    say("Please check your attachments. Add up to 3 supported files, each 10 MB or smaller.");
    return;
  }

  submitButton.disabled = true;
  submitButton.classList.add("is-loading");
  submitButton.querySelector("span:first-child").textContent = files.length ? "Uploading & sending…" : "Sending…";

  try {
    const settings = config();
    const attachmentPaths = [];
    for (const file of files) attachmentPaths.push(await uploadFile(file, settings));

    await sendFeedback({
      person_name: form.elements.person_name.value.trim(),
      email: form.elements.email.value.trim().toLowerCase(),
      category: form.elements.category.value,
      feedback_text: feedbackInput.value.trim(),
      attachment_paths: attachmentPaths,
      source_url: window.location.href,
    }, settings);

    form.reset();
    charCount.textContent = "0 / 4,000";
    fileList.replaceChildren();
    say("Your feedback is in. Thanks for taking the time to make things better.", "success");
  } catch (error) {
    say(error instanceof Error ? error.message : "Something went wrong. Please try again.");
  } finally {
    submitButton.disabled = false;
    submitButton.classList.remove("is-loading");
    submitButton.querySelector("span:first-child").textContent = "Send feedback";
  }
});

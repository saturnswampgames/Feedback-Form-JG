import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const settings = window.FEEDBACK_CONFIG || {};
const loginView = document.querySelector("#login-view");
const exportView = document.querySelector("#export-view");
const status = document.querySelector("#admin-status");
const loginForm = document.querySelector("#login-form");
const loginButton = document.querySelector("#login-button");
const exportButton = document.querySelector("#export-button");
const signOutButton = document.querySelector("#sign-out-button");

const client = settings.supabaseUrl && settings.supabasePublishableKey
  ? createClient(settings.supabaseUrl, settings.supabasePublishableKey)
  : null;

function showStatus(text = "", tone = "") {
  status.textContent = text;
  status.className = `admin-status${tone ? ` ${tone}` : ""}`;
}

function setSignedIn(user) {
  loginView.hidden = Boolean(user);
  exportView.hidden = !user;
  if (user) document.querySelector("#signed-in-email").textContent = `Signed in as ${user.email}.`;
}

function configError() {
  if (!client) showStatus("This portal isn’t connected to Supabase. Check config.js.", "error");
}

if (client) {
  client.auth.onAuthStateChange((_event, session) => {
    setSignedIn(session?.user || null);
    if (!session) showStatus();
  });

  client.auth.getSession().then(({ data: { session } }) => setSignedIn(session?.user || null));

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    showStatus();
    loginButton.disabled = true;
    loginButton.textContent = "Signing in…";
    const form = new FormData(loginForm);
    const { error } = await client.auth.signInWithPassword({
      email: String(form.get("email")).trim(),
      password: String(form.get("password")),
    });
    if (error) showStatus(error.message, "error");
    loginButton.disabled = false;
    loginButton.textContent = "Sign in";
  });

  signOutButton.addEventListener("click", async () => {
    await client.auth.signOut();
    showStatus("You’ve been signed out.", "success");
  });

  exportButton.addEventListener("click", async () => {
    showStatus();
    exportButton.disabled = true;
    exportButton.textContent = "Preparing workbook…";
    try {
      const { data: { session } } = await client.auth.getSession();
      if (!session) throw new Error("Your session has expired. Please sign in again.");
      const response = await fetch(`${settings.supabaseUrl.replace(/\/$/, "")}/functions/v1/admin-feedback-export`, {
        method: "POST",
        headers: {
          apikey: settings.supabasePublishableKey,
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "The export could not be created.");

      const XLSX = await import("https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs");
      const rows = payload.rows || [];
      const sheetRows = rows.map((row) => ({
        "Submitted at (UTC)": row.created_at ? new Date(row.created_at).toISOString().replace("T", " ").replace(".000Z", " UTC") : "",
        "Name": row.person_name,
        "Email": row.email,
        "Category": row.category,
        "Feedback": row.feedback_text,
        "Attachment paths": (row.attachment_paths || []).join("\n"),
        "Source page": row.source_url || "",
        "Submission ID": row.id,
      }));
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(sheetRows, {
        header: ["Submitted at (UTC)", "Name", "Email", "Category", "Feedback", "Attachment paths", "Source page", "Submission ID"],
      });
      worksheet["!cols"] = [
        { wch: 24 }, { wch: 24 }, { wch: 32 }, { wch: 18 }, { wch: 64 }, { wch: 42 }, { wch: 36 }, { wch: 38 },
      ];
      worksheet["!autofilter"] = { ref: worksheet["!ref"] || "A1:H1" };
      worksheet["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" };
      XLSX.utils.book_append_sheet(workbook, worksheet, "Feedback");
      XLSX.writeFile(workbook, `feedback-export-${new Date().toISOString().slice(0, 10)}.xlsx`);
      showStatus(`${rows.length} ${rows.length === 1 ? "submission" : "submissions"} exported.`, "success");
    } catch (error) {
      showStatus(error instanceof Error ? error.message : "The export could not be created.", "error");
    } finally {
      exportButton.disabled = false;
      exportButton.textContent = "Download Excel workbook";
    }
  });
} else {
  configError();
}

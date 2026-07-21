"use strict";

// This is a Supabase publishable key. RLS policies protect the data; no secret key is shipped to browsers.
window.PETFORGE_SUPABASE = {
  url: "https://babhvhgunhgxvvvxaacr.supabase.co",
  publishableKey: "sb_publishable_fkB7_xb_OBl5T0r09tE0yA_CmcgQ5iS",
  bucket: "workshop"
};

// Membership is shared with Cloud Paw Memorial. The Worker owns accounts, card codes and VIP expiry.
window.PETFORGE_MEMBERSHIP = {
  apiUrl: "https://cloud-paw-vip-api.cloud-paw-vip-080805liang.workers.dev",
  sessionKey: "cloud-paw-session"
};

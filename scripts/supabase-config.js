"use strict";

// This is a Supabase publishable key. RLS policies protect the data; no secret key is shipped to browsers.
window.PETFORGE_SUPABASE = {
  url: "https://babhvhgunhgxvvvxaacr.supabase.co",
  publishableKey: "sb_publishable_fkB7_xb_OBl5T0r09tE0yA_CmcgQ5iS",
  bucket: "workshop"
};

// Membership is shared with Cloud Paw Memorial. CloudBase owns accounts, card codes and VIP expiry.
const cloudBaseOrigin = "https://cloud-paw-vip-cn-d0eub7r110788a3-1460995143.ap-shanghai.app.tcloudbase.com";
const isCloudBaseSite = /\.app\.tcloudbase\.com$/i.test(window.location.hostname);
const isLocalSite = /^(?:localhost|127\.0\.0\.1)$/i.test(window.location.hostname);
window.PETFORGE_MEMBERSHIP = {
  apiUrl: isCloudBaseSite || isLocalSite ? "/api" : `${cloudBaseOrigin}/api`,
  sessionKey: "cloud-paw-session"
};

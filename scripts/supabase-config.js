"use strict";

// This is a Supabase publishable key. RLS policies protect the data; no secret key is shipped to browsers.
window.PETFORGE_SUPABASE = {
  url: "https://babhvhgunhgxvvvxaacr.supabase.co",
  publishableKey: "sb_publishable_fkB7_xb_OBl5T0r09tE0yA_CmcgQ5iS",
  bucket: "workshop"
};

// Membership reuses the proven account and card-code service from the existing paid product.
// The key is publishable; card codes remain hashed and are redeemed by an RLS-protected database function.
window.PETFORGE_MEMBERSHIP = {
  url: "https://ojohdsngxeoubynhpmtf.supabase.co",
  publishableKey: "sb_publishable_VEq5R7M6rz2VC7XpfJu4qw_QYiVcnfn"
};

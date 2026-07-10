/**
 * OAuth user authentication against ArcGIS Online using the redirect flow.
 */
import esriConfig from "@arcgis/core/config.js";
import IdentityManager from "@arcgis/core/identity/IdentityManager.js";
import OAuthInfo from "@arcgis/core/identity/OAuthInfo.js";
import Portal from "@arcgis/core/portal/Portal.js";
import { APP_ID, PORTAL_URL } from "./config";

/** The `/sharing` REST endpoint used when checking sign-in status. */
const SHARING_URL = `${PORTAL_URL}/sharing`;

let oauthInfo: OAuthInfo | null = null;

/**
 * Register the OAuth application with the IdentityManager. Must be called once
 * before any authenticated requests are made.
 */
export function initAuth(): void {
  if (!APP_ID) {
    throw new Error(
      "Missing ArcGIS application ID. Set VITE_ARCGIS_APP_ID in your .env file."
    );
  }

  esriConfig.portalUrl = PORTAL_URL;

  oauthInfo = new OAuthInfo({
    appId: APP_ID,
    portalUrl: PORTAL_URL,
    // Use full-page redirect (not a popup) for sign in.
    popup: false,
    flowType: "authorization-code",
  });

  IdentityManager.registerOAuthInfos([oauthInfo]);
}

/** Represents the currently signed-in user. */
export interface SignedInUser {
  username: string;
  fullName: string;
}

/**
 * Returns the signed-in user if a valid credential already exists, otherwise
 * `null`. This completes the redirect flow when returning from the OAuth page.
 */
export async function getCurrentUser(): Promise<SignedInUser | null> {
  try {
    await IdentityManager.checkSignInStatus(SHARING_URL);
  } catch {
    return null;
  }

  const portal = new Portal({ url: PORTAL_URL });
  await portal.load();
  const user = portal.user;
  return {
    username: user?.username ?? "",
    fullName: user?.fullName || user?.username || "",
  };
}

/** Begins the OAuth redirect. The browser navigates away from the app. */
export async function signIn(): Promise<void> {
  // getCredential triggers the redirect when no credential is present.
  await IdentityManager.getCredential(SHARING_URL);
}

/** Clears local credentials and reloads the app. */
export function signOut(): void {
  IdentityManager.destroyCredentials();
  window.location.reload();
}

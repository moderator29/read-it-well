package com.vallospaces.app;

import android.os.Bundle;
import android.webkit.WebView;
import androidx.webkit.WebSettingsCompat;
import androidx.webkit.WebViewFeature;
import com.getcapacitor.BridgeActivity;

/**
 * FACE UNLOCK AND FINGERPRINT IN THE APP (7 October 2026, the founder: "set and
 * build Face ID to work").
 *
 * Vallo's biometric is a WebAuthn platform key (a passkey) whose assertion
 * the SERVER verifies before it writes the unlock (`src/lib/passcode/passkey-unlock.ts`);
 * the same key confirms payments. A WebView does not run WebAuthn unless the
 * app asks for it, so this turns it on for the app's own web view, on a
 * device whose WebView supports it (androidx.webkit, WEB_AUTHENTICATION).
 * With the app's identity, Android requires the site to vouch for the app in
 * `public/.well-known/assetlinks.json` with the
 * `delegate_permission/common.get_login_creds` relation, and that file's two
 * SHA-256 fingerprints are still placeholders (see AndroidManifest.xml): until
 * the owner fills them, the platform refuses the ceremony and the lock falls
 * back to the passcode, exactly as on a device without a biometric.
 *
 * Nothing here decides an unlock. It needs a NATIVE REBUILD.
 */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        try {
            if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_AUTHENTICATION) && getBridge() != null) {
                WebView webView = getBridge().getWebView();
                WebSettingsCompat.setWebAuthenticationSupport(
                    webView.getSettings(),
                    WebSettingsCompat.WEB_AUTHENTICATION_SUPPORT_FOR_APP
                );
            }
        } catch (Throwable ignored) {
            // An older WebView without the feature: the passcode stays the way in.
        }
    }
}

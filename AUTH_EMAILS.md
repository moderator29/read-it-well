# The auth emails

The five messages Supabase sends on our behalf: confirm sign-up, magic link,
password reset, email change and re-authentication. This file holds the HTML for
each one and the two dashboard settings that make them arrive as RentMe rather
than as Supabase.

**Nothing in this file is applied by deploying.** Auth emails are rendered by
Supabase, not by this application, so the templates live in the Supabase
dashboard and this file is the source they are copied from. Changing the
markup here changes nothing until it is pasted. That is the whole reason the
file exists: without it the only copy of this HTML is inside a web form nobody
can diff.

---

## 1. Send as RentMe, not as Supabase

The sender identity is a project setting and it is why the inbox still says
"Supabase Auth". Templates cannot fix it; the from-address is decided before
the template is rendered.

**Project Settings → Authentication → SMTP Settings**, enable custom SMTP:

| Field | Value |
| --- | --- |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | a Resend API key |
| Sender email | `no-reply@` your verified domain |
| Sender name | `RentMe` |

The domain has to be verified in Resend first (Domains → Add → the DNS records
it gives you). Until then Resend will only deliver to your own address, which is
enough to test with and not enough to launch on.

Resend by SMTP rather than by the Send Email Hook, deliberately: the hook means
an endpoint we host, a shared secret, and an outage in our deployment becoming
an outage in sign-up. SMTP is one settings page and Supabase keeps its own
retries. The hook is worth revisiting only if these five templates stop being
enough.

## 2. A code, not a link

`supabase.auth.signUp` is called with `emailRedirectTo`, so the default template
sends `{{ .ConfirmationURL }}`. Our screen asks for six digits. Both halves work
in the code already: `verifyOtp` accepts a `token` and a `token_hash`.

Every template below uses `{{ .Token }}`, which is the six digit code. Once
these are pasted, the screen and the inbox agree.

## 3. The banner

The band at the top is a photograph with **no text baked into it**. The headline
under it is real text.

That is not a style preference. Every serious mail client blocks images by
default on first receipt, and a headline inside a JPEG is a headline a large
share of people never see; it also cannot be read aloud, cannot be selected,
cannot be translated and does not reflow on a phone. So the image carries
atmosphere and the words carry meaning, which is the same rule the in-app email
shell already follows.

`https://YOUR-DOMAIN/brand/rentme-villa.png` is already in the deployment and is
the image used below. Replace `YOUR-DOMAIN` throughout with the real host.

---

## Template: Confirm sign-up

Subject: `Your RentMe code is {{ .Token }}`

```html
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#F4F6FB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;">Your six digit code is {{ .Token }}. It expires in an hour.</span>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F6FB;">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:18px;overflow:hidden;box-shadow:0 1px 3px rgba(16,24,40,0.08);">

            <!-- Wordmark. Small, on paper, above the band. -->
            <tr>
              <td style="padding:20px 28px 16px;">
                <img src="https://YOUR-DOMAIN/brand/rentme-logo.png" width="34" height="34" alt="RentMe" style="display:block;border:0;" />
              </td>
            </tr>

            <!-- The banner. Atmosphere only: every word is real text below it. -->
            <tr>
              <td style="padding:0;">
                <img src="https://YOUR-DOMAIN/brand/rentme-villa.png" width="560" alt="" style="display:block;width:100%;max-width:560px;height:auto;border:0;" />
              </td>
            </tr>

            <tr>
              <td style="padding:28px;">
                <h1 style="margin:0 0 8px;font-size:22px;line-height:1.25;color:#101828;font-weight:700;">
                  Confirm your email
                </h1>
                <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#475467;">
                  Hello, and welcome to RentMe. Enter this code on the confirmation
                  screen and your account is open.
                </p>

                <!-- The code. Letter-spaced, selectable, never an image. -->
                <div style="margin:0 0 20px;padding:16px;border:1px solid #E4E7EC;border-radius:12px;background:#F9FAFB;text-align:center;">
                  <div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:30px;letter-spacing:8px;font-weight:700;color:#0010E0;">
                    {{ .Token }}
                  </div>
                </div>

                <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#475467;">
                  The code lasts one hour. If it expires, ask for another from the
                  same screen.
                </p>

                <p style="margin:0 0 6px;font-size:15px;line-height:1.6;color:#101828;font-weight:600;">
                  What you can do once you are in
                </p>
                <ul style="margin:0 0 20px;padding-left:20px;font-size:14px;line-height:1.7;color:#475467;">
                  <li>Search homes to rent, homes to buy, shortlets, land and commercial space.</li>
                  <li>See the whole move-in cost before you commit: rent, caution, agency, legal.</li>
                  <li>Check the light, the water and the gate on every listing.</li>
                  <li>List your own property and take enquiries from day one.</li>
                </ul>

                <p style="margin:0;padding:14px 16px;border-radius:10px;background:#FFF6E5;font-size:13px;line-height:1.6;color:#7A4E00;">
                  <strong>Keep it on RentMe.</strong> Never send money to anybody
                  outside the platform, and never share this code with anyone.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:0 28px 28px;">
                <p style="margin:0;font-size:12px;line-height:1.6;color:#98A2B3;border-top:1px solid #F2F4F7;padding-top:16px;">
                  You are getting this because somebody used this address to
                  create a RentMe account. If that was not you, ignore this email
                  and nothing happens.
                  <br /><br />
                  RentMe &middot; Nigeria
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

## The other four

Same shell, one paragraph and one heading different. Copy the block above and
change only the parts named here; keeping five near-identical templates is
deliberate, because Supabase gives each one its own editor and a shared partial
does not exist.

| Template | Subject | Heading | Lead paragraph |
| --- | --- | --- | --- |
| Magic link | `Your RentMe code is {{ .Token }}` | Sign in to RentMe | Enter this code to sign in. It works once and lasts an hour. |
| Reset password | `Your RentMe reset code is {{ .Token }}` | Reset your password | Enter this code to set a new password. If you did not ask for this, your password has not changed. |
| Change email | `Confirm your new address` | Confirm this address | Enter this code to move your RentMe account to this address. |
| Reauthentication | `Your RentMe code is {{ .Token }}` | Confirm it is you | Enter this code to confirm the change you just asked for. |

Drop the "What you can do once you are in" list from all four: it belongs in the
one email somebody reads before they have an account and is noise in the four
they read afterwards. Keep the amber safety line on every one.

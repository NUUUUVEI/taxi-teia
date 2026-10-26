# Launching on taxiteia.com

The domain is registered with **Sered** (DNS servers `dns1–4.sered.net`), on the
client's account. Today `taxiteia.com` and `www` point at the old website on
Sered's server `185.125.78.117`, and so do `mail`, `ftp` and `webmail`.

Only `taxiteia.com` and `www` move to Vercel. **Do not touch `mail`, `ftp`,
`webmail` or the MX record**, or the client's email stops working.

## 1. Before launch day (any time this week)

### Content still marked as pending
- [ ] `apps/web/src/lib/site.ts`: `legalName`, `taxId`, `registeredAddress`,
      `taxiLicence` (legal notice page shows a warning until filled in)
- [ ] `footer.license` in `apps/web/messages/{ca,es,en}.json` (still `VT-XXXXX`)
- [ ] Photos of the new car in `apps/web/public/images/car/` (see README)
- [ ] Rates in `apps/web/src/lib/tariff.ts` confirmed with Marc

### Accounts
- [ ] Supabase → Authentication → Users → **Add user** `marctaxiteia@gmail.com`
      with a password for Marc. It becomes a driver automatically.
- [ ] Supabase → Authentication → Sign In / Providers → turn off
      **Allow new users to sign up**.

### Email sending (Resend)
- [ ] resend.com → Domains → **Add domain** `taxiteia.com`, region **EU (Ireland)**.
- [ ] Add the records Resend shows in Sered's DNS panel. They look like this, but
      copy the exact values from Resend:

      | Type | Name | Value |
      |---|---|---|
      | MX | `send` | `feedback-smtp.eu-west-1.amazonses.com` (priority 10) |
      | TXT | `send` | `v=spf1 include:amazonses.com ~all` |
      | TXT | `resend._domainkey` | `p=MIGfMA0…` (long DKIM key) |

      These are new names, so they do not affect the client's current email.
- [ ] Wait until Resend shows **Verified** (minutes to a few hours).

### Fix the client's existing SPF record (same DNS panel)
The current root TXT record contains `ip4:185.12578.117` (missing a dot). That
makes the whole record invalid, so mail the client sends from @taxiteia.com can
already end up in spam. Replace it with:

```
v=spf1 ip4:185.125.78.117 include:_spf.gestiondeservidor.net +mx ip4:185.162.171.120 -all
```

(Same servers as before without the broken entry. `+a` is dropped because the
root domain will point to Vercel, which does not send this email.)

## 2. Launch day

1. **Vercel → project → Settings → Domains**: add `taxiteia.com` and
   `www.taxiteia.com`. Vercel shows the DNS values to use.
2. **Sered DNS panel**, using Vercel's values:

   | Type | Name | Value |
   |---|---|---|
   | A | `@` (taxiteia.com) | Vercel's IP (e.g. `76.76.21.21`) |
   | CNAME | `www` | Vercel's target (e.g. `cname.vercel-dns.com`) |

   Replace the existing `@` and `www` entries. Leave everything else.
3. **Vercel → Environment Variables** (Production and Preview), then **Redeploy**:
   - `NEXT_PUBLIC_SITE_URL` = `https://www.taxiteia.com` (or the apex, whichever
     Vercel is set to redirect to)
   - `SUPABASE_SERVICE_ROLE_KEY` set (bookings are refused without it)
4. **Google Cloud → APIs → Credentials**: add `https://taxiteia.com/*` and
   `https://www.taxiteia.com/*` to the Maps key's allowed referrers.
5. **Supabase → Authentication → URL Configuration**: Site URL
   `https://www.taxiteia.com`.
6. Once Resend says Verified, remove the test settings so real clients get
   their emails:
   ```bash
   supabase secrets unset EMAIL_FROM EMAIL_OVERRIDE_TO
   ```

## 3. Check it works
- [ ] https://taxiteia.com and https://www.taxiteia.com load the new site with
      a valid padlock (Vercel issues the certificate once DNS has propagated,
      usually within an hour).
- [ ] The client can still send and receive email at @taxiteia.com.
- [ ] Book a trip with your own email: Marc's phone rings, Marc gets the
      "Nova reserva" email, you get "Sol·licitud rebuda".
- [ ] In the app, change the time: you get "Canvi d'hora". Accept: you get
      "Reserva confirmada".
- [ ] Cancel the test booking.

<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- Two areas: customer app at `/` (mobile-first, phone frame on desktop via `AppShell`) and company panel under `/empresa/*` (`AdminShell`, gated in `src/routes/empresa.tsx`). Why: mirrors the client/company split of the reference design.
- Booking writes go only through the `create_booking` / `cancel_my_booking` database functions; customers have no direct insert/update on `appointments`. Why: server-side checks for hours, slot alignment, blocked time and overlaps.
- Double booking is prevented by the `appointment_no_overlap` exclusion constraint (statuses `agendado`, `em_andamento`); keep any new reserving status in that list.
- Slot math lives in `src/lib/booking-time.ts` (business time zone from `business_settings.timezone`); submit the slot's ISO timestamp, never a local clock string. Tests: `src/lib/booking-time.test.ts`.
- Company admin = `admin` row in `user_roles`; the first signed-in user who presses "Ativar painel da empresa" claims it via `claim_business_owner()`. Why: no hardcoded owner email.
- Public photo uploads are blocked on this project; services/professionals pick from `PHOTO_GALLERY` (CDN assets) or a pasted https link.

## Owner time off (live calendar)

- The control is **Painel → Agenda → "Bloquear horário"** (writes `time_off`; `professional_id` null = whole team). Blocks hide new slots only; existing appointments stay. "Liberar" removes a block.
- "Close tonight": use Bloquear horário for those hours with "Toda a equipe".
- "We're closed every Monday": set it in **Painel → Configurações → Dias que a unidade abre** (checked = open; stored inverted as `business_settings.closed_weekdays`). Opening hours and slot interval are there too.
- Auth email links always point at the Lovable-published site (`PUBLIC_SITE_URL`); `/auth/retorno` then hands the session to the site the customer signed up on, only if its origin is in `EXTRA_APP_ORIGINS` (`src/lib/site-url.ts`, tests in `site-url.test.ts`). Why: the backend only accepts redirects to Lovable domains, and an open forward would leak sessions.

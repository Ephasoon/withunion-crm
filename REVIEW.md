# WithUnion CRM — Feature Review Checklist

Work through this list after `npm run dev`. Tick each item and note anything
you want changed. We will fix everything before deploying.

---

## Setup verification

- [ ] `npm install` completed without errors
- [ ] `npm run setup` printed "🎉 Database seeded successfully!"
- [ ] `npm run dev` shows "Ready in …"
- [ ] <http://localhost:3000> redirects to `/dashboard`
- [ ] <http://localhost:3000/api/health> shows `"status": "ok"`

---

## 1. Dashboard — `/dashboard`

- [ ] Purple **AI Insight banner** appears at the top
- [ ] **6 KPI cards**: Revenue, Leads, Clients, Projects, Conversion, Commission
- [ ] **Revenue Trend** area chart renders
- [ ] **Pipeline Stages** donut chart renders
- [ ] **Recent Activity** list shows 5 entries with emoji icons
- [ ] **Follow-Ups** panel shows upcoming dates
- [ ] **Alerts** panel shows unread notifications
- [ ] **Top Clients** table sorted by revenue (Capital Construction first)

**Notes:**
```
```

---

## 2. Leads — `/leads`

- [ ] Table lists 5 leads
- [ ] **Search** — type `Hana` → filters to 1 row
- [ ] **Stage pills** — click `Negotiation` → shows Ruth Solomon only
- [ ] **Score bars** are colour-coded (green ≥75, amber ≥50, red <50)
- [ ] **Add Lead** button opens the modal
- [ ] Create a test lead → appears in the table immediately
- [ ] Refresh the page → your test lead is still there *(proves real DB)*

**Notes:**
```
```

---

## 3. Clients — `/clients`

- [ ] 5 client cards in grid view
- [ ] Toggle to **table view** (icons top-right)
- [ ] Industry colour badges (Healthcare red, Technology blue…)
- [ ] Revenue figures formatted as `ETB 2,100,000`
- [ ] **Add Client** modal works

**Notes:**
```
```

---

## 4. Pipeline — `/pipeline`

- [ ] **8 Kanban columns**: Lead → Qualified → Meeting → Proposal → Negotiation → Won → Project → Support
- [ ] Summary bar at top shows counts and ETB totals per stage
- [ ] Lead cards show avatar, company, value, score bar
- [ ] High-score leads (≥70) show a ★ star
- [ ] Horizontal scroll works
- [ ] Empty columns show dashed "Add lead" placeholder

**Notes:**
```
```

---

## 5. Projects — `/projects`

- [ ] 3 project cards
- [ ] Progress bars: HMS 40%, Lucy School 20%, Capital 100%
- [ ] Budget vs Spent displayed
- [ ] Days-left countdown (red when overdue)
- [ ] Status filter pills work (All / Planning / Active / Completed…)

**Notes:**
```
```

---

## 6. Invoices — `/invoices`

- [ ] 4 summary cards: Revenue, Pending, Overdue, Total
- [ ] Table with 4 invoices
- [ ] Status badges: `paid` green, `sent` blue, `overdue` red
- [ ] INV-2024-003 shows "10 days overdue" in red
- [ ] Status filter pills work

**Notes:**
```
```

---

## 7. Payments — `/payments`

- [ ] Received / Pending / Failed summary cards
- [ ] 4 payment-method cards: Bank Transfer, Telebirr, Chapa, Stripe
- [ ] Transaction table with reference numbers

> ⚠️ This page currently uses **placeholder rows**, not live DB data.
> Tell me if you want it wired to the real `payments` table.

**Notes:**
```
```

---

## 8. Commissions — `/commissions`

- [ ] Total / Paid / Pending summary
- [ ] Leaderboard with 🥇🥈🥉 medals
- [ ] Paid-vs-pending progress bar per rep
- [ ] Monthly trend bar chart
- [ ] Transactions table at the bottom

> ⚠️ Also placeholder data — say the word and I'll connect it.

**Notes:**
```
```

---

## 9. Analytics — `/analytics`

- [ ] 4 KPI cards with up/down trend arrows
- [ ] **Revenue vs Expenses** grouped bar chart
- [ ] **Revenue by Industry** donut + legend
- [ ] **Sales Leaderboard** with gradient bars
- [ ] **Performance Radar** hexagon chart
- [ ] **Revenue Forecast** with 3 scenario lines
- [ ] Period selector (1m / 3m / 6m / 1y) highlights correctly

> ⚠️ Charts use illustrative data. Real aggregation comes after auth.

**Notes:**
```
```

---

## 10. AI Assistant — `/ai`

Try each prompt and confirm a useful answer appears:

- [ ] `Analyze my leads`
- [ ] `Generate a proposal`
- [ ] `Write a follow-up email`
- [ ] `Revenue forecast`
- [ ] `Which deals will close this week?`
- [ ] `Translate to Amharic` *(returns an English↔Amharic phrase table)*
- [ ] Typing indicator animates while waiting
- [ ] Copy button works on AI replies
- [ ] `Enter` sends, `Shift+Enter` makes a new line
- [ ] Suggested prompt cards disappear after first message

**Notes:**
```
```

---

## 11. Notifications — `/notifications`

- [ ] 8 notifications listed
- [ ] Unread ones have a violet left tint + dot
- [ ] Type filters work (AI / Deals / Invoices / Payments…)
- [ ] **Mark all read** clears the highlights
- [ ] Delete (trash icon) removes a row

**Notes:**
```
```

---

## 12. Settings — `/settings`

- [ ] Left sub-navigation with 8 sections
- [ ] **Organization** — form fields, Save shows "Saved!"
- [ ] **Team & Roles** — 4 members with role badges
- [ ] **Commission Rules** — rate inputs
- [ ] **Security** — 5 toggle switches
- [ ] **Integrations** — 8 cards (OpenAI shows "Connected")

> ⚠️ Settings are display-only right now — they don't persist yet.

**Notes:**
```
```

---

## Cross-cutting checks

### Dark mode
- [ ] Click the 🌙 icon in the top bar
- [ ] Every page stays readable in dark mode
- [ ] Preference survives a page refresh

### Responsive / mobile
- [ ] Press `F12` → toggle device toolbar → choose iPhone
- [ ] Tables collapse columns gracefully
- [ ] Sidebar collapse button (`‹`) works

### Keyboard & search
- [ ] `Ctrl + K` opens the search modal
- [ ] `Esc` closes it
- [ ] Quick links navigate correctly

### Performance
- [ ] Page transitions feel instant
- [ ] Skeleton loaders appear briefly, not forever
- [ ] No red errors in the browser console (`F12` → Console)

---

## Database inspection (optional)

```powershell
npm run db:studio
```

Opens a visual browser for all 17 tables. Confirm:

- [ ] `organizations` — 1 row
- [ ] `users` — 4 rows
- [ ] `clients` — 5 rows
- [ ] `leads` — 5 rows
- [ ] `deals` — 5 rows
- [ ] `projects` — 3 rows
- [ ] `invoices` — 4 rows

---

## Known gaps (already identified)

| Gap | Impact | Priority |
|---|---|---|
| **No authentication** | Anyone with the URL sees all data | 🔴 Blocks deployment |
| Payments page uses static rows | Cosmetic | 🟡 |
| Commissions page uses static rows | Cosmetic | 🟡 |
| Analytics charts use sample data | Cosmetic | 🟡 |
| Settings don't save | Functional | 🟡 |
| No edit/delete on leads & clients | Functional | 🟡 |
| No PDF export for invoices | Feature | 🟢 |
| No file upload | Feature | 🟢 |

---

## Your verdict

**Things I want changed before deployment:**
```
1.
2.
3.
```

**Things I love and want to keep:**
```
1.
2.
3.
```

**Priority for the next build:**
```
[ ] Authentication (login, roles, protected routes)
[ ] Wire Payments / Commissions / Analytics to live data
[ ] Edit & delete actions
[ ] Invoice PDF generation
[ ] Something else: ______________________
```

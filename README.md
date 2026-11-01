# SMS UI

Angular frontend for the SMS employee and salary management application. It
connects to the separate Spring Boot SMS API; deployed builds call that API
over HTTPS while the API connects to Supabase PostgreSQL.

The app uses Angular 21, standalone components, signals, reactive forms, RxJS,
and Chart.js. Application routes render in the browser and load data at runtime.

## Current features

- JWT login and guarded dashboard, employee, and report routes.
- Department dashboard with employee counts.
- Department employee lists with 20 rows per page.
- Create and edit dialogs with salary validation and a calculated total.
- Employee deletion with confirmation and pagination refresh.
- Salary breakdown dialogs and CSV downloads using embedded employee data.
- Average salary charts grouped by department or country, with headcounts and
  missing-salary information.
- Profile details, logout, and success notifications for employee changes.

Salary and country filtering are not currently part of the UI. Salary details
come from `salaryStructureDto` in employee responses, without another API request.

## Local setup

Use Node.js 24.x and npm. The project declares npm 11.13.0 as its package manager.
Run commands from the directory containing this README, `angular.json`, and
`package.json` (`SMS-UI/sms-ui` in the current workspace). The outer `SMS-UI`
directory also contains package files and is not the Angular app root.

Start the SMS API at `http://localhost:8080`, then install and start the frontend:

```powershell
npm ci
npm start
```

Open `http://localhost:4200/` and sign in with an application user from the
backend's `users` table. There is no frontend signup flow. A Supabase Auth
account alone is not an SMS login account.

### API configuration

The API origin is provided through `API_BASE_URL` in `src/app/api.config.ts`.

| Build | API origin |
| --- | --- |
| `npm start` / ordinary `npm run build` | `http://localhost:8080`, from `src/environments/environment.ts` |
| `npm run build:vercel` | HTTPS origin supplied in `SMS_API_URL` at build time |

Services currently use absolute API URLs. Although `proxy.conf.json` contains
development proxies for `/departments` and `/employees`, those absolute requests
go directly to the backend. Configure backend CORS for the exact frontend origin
(`http://localhost:4200` locally).

## Routes and authentication

| Route | Page |
| --- | --- |
| `/` | Login; an authenticated user is redirected to the dashboard |
| `/dashboard` | Department dashboard |
| `/employee/:departmentId` | Department employee list and employee dialogs |
| `/report` | Average salary report |

The login form posts `{ name, password }` to `/auth/login`. A successful response
must include `authenticated: true`, `name`, a valid `loginTime`, and `token`.
The header displays the server-provided identity and login time in the browser's
local timezone.

The JWT and session are held in memory. Refreshing the page requires signing in
again. The HTTP interceptor attaches the bearer token only to the configured API
origin, excluding login requests. A 401 response for the current token clears the
session and returns to login. Logout clears local state; issued tokens remain
valid until their backend expiry, which defaults to 30 minutes.

## Employee and report behavior

Selecting a department opens its employee list. Direct employee URLs load the
department metadata when it is not already cached. Employee requests use
`/employees?dep_id={departmentId}&page={page}&size=20`, with zero-based page
numbers. Department `totalEmployees` values determine the page count.

The New and Edit dialogs submit the employee's name, country, department, and
salary components. Write requests send decimal strings to preserve monetary
precision. The total is fixed pay plus variable pay plus bonuses minus deduction;
invalid amounts and negative totals are rejected. Successful changes refresh
employee data and department counts. Deleting the last employee on a page moves
back when needed.

Selecting a salary opens the embedded breakdown (`empId`, `fixedPay`,
`variablePay`, `bonuses`, and `deduction`). CSV export includes employee details,
components, and the calculated total. Missing or mismatched breakdowns cannot
be exported.

The report calls `/reports/salary-distribution?groupBy=department` or
`groupBy=country` and displays average salaries in a horizontal bar chart with
an accompanying table. Recorded zero salaries are included in averages;
missing salaries are counted separately and excluded from averages. Values are
shown as recorded and assume a common currency and pay period.

## Tests

```powershell
# Interactive/watch mode
npm test

# Full suite, once
npm test -- --watch=false

# Focused report/chart checks
npm run test:report

# Focused login, interceptor, dashboard-service, and report checks
npm run test:deployment

# Validate rejection of invalid Vercel API settings
npm run test:build-config
```

Angular's test builder runs Vitest with jsdom. HTTP tests mock API responses, so
the frontend suite does not need a running backend or database. Navigation tests
exercise the actual router and guarded routes. There is no configured browser
end-to-end test target.

The latest verified full run passed 79 tests across 21 files, plus all six
deployment-configuration tests, on November 2, 2026. The focused scripts select
subsets of the suite; use the full command to check all current features.

## Builds and Vercel deployment

```powershell
# Production build using the local API configuration
npm run build

# Static Vercel build using the deployed API origin
$env:SMS_API_URL = 'https://YOUR-API-PROJECT.vercel.app'
npm run build:vercel
```

The Vercel build script validates `SMS_API_URL`, generates the ignored
`src/environments/environment.vercel.ts`, and builds with the
`production,vercel` configurations. The URL must be an HTTPS origin without a
path, credentials, query, or fragment. The script reads the process environment;
it does not automatically load `.env` files. Changing the API origin requires
rebuilding the frontend.

The checked-in `vercel.json` uses `npm ci`, `npm run build:vercel`, and
`dist/sms-ui/browser` as its output directory. It rewrites application paths to
`index.html` for SPA routing. The Vercel configuration disables Angular
server/SSR output; no frontend Node server is needed for this deployment.
Ordinary builds retain the server build configuration, although application
routes still use client rendering.

Deploy the API and frontend as separate projects. Set `SMS_API_URL` in the
frontend project and allow its exact origin through the API's
`CORS_ALLOWED_ORIGINS`. Database credentials and JWT signing keys belong in the
backend project. See [DEPLOYMENT.md](DEPLOYMENT.md) for deployment steps,
environment scoping, and checks. Its focused-test workaround note predates the
current passing full suite.

## Project layout

```text
src/app/
  login/                       Login, guards, and JWT interceptor
  dashboard-shell/             Shared authenticated layout
  dashboard/                   Department dashboard
  employee/                    Employee list and pagination
  create-employee-dialog/      Employee creation dialog
  edit-employee-dialog/        Employee editing dialog
  employee-form-dialog/        Shared form and save logic
  delete-employee-dialog/      Deletion confirmation and requests
  salary-structure-dialog/     Salary breakdown and CSV export
  report/                      Report loading and grouping controls
  salary-distribution-chart/   Chart and report table
  header/                      Navigation, profile, and notifications
  controller/                  Shared department API access
src/environments/              Local and generated deployment API settings
scripts/                       Vercel build and configuration tests
```

Create new standalone components with `npx ng g c component-name` and services
with `npx ng g s service-name`. Keep business logic in the corresponding service.

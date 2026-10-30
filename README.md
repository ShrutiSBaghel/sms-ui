# SmsUi

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.13.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

The dashboard requests `GET /departments` and expects an array of
`{ id: number, name: string, totalEmployees: number }`. Start the SMS backend on
port 8080 before loading the dashboard. The development server forwards this
request through `proxy.conf.json`; update its target if your backend uses a
different address. Production hosting must forward `/departments` to the backend
on the same origin as the UI.

Home (`/`) lists departments. Select any department row to view its employees
at `/employee/:departmentId`. The employee list requests
`GET /employees?dep_id={departmentId}&page={page}&size=20`, using zero-based page
numbers. Pagination uses the department's `totalEmployees`; opening an employee
URL directly also loads department metadata. The development proxy forwards
`/employees` to the backend, and production hosting must forward this path too.
Salary links open an empty salary structure dialog; filtering and salary
downloads are not implemented. The header includes a Login placeholder.
These pages render in the browser so builds do not need access to the backend.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

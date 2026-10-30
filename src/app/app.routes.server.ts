import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    // Department data is loaded in the browser from the backend at runtime.
    renderMode: RenderMode.Client,
  },
];

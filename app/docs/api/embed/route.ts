import { ApiReference } from '@scalar/nextjs-api-reference'

export const dynamic = 'force-dynamic'

const DARK_MODE_CSS = `
  html[data-scalar-theme="dark"],
  html[data-scalar-theme="dark"] body,
  html[data-scalar-theme="dark"] #app,
  html[data-scalar-theme="dark"] .light-mode,
  html[data-scalar-theme="dark"] .dark-mode,
  html[data-scalar-theme="dark"] * {
    --scalar-color-1: rgba(255, 255, 255, 0.9) !important;
    --scalar-color-2: rgba(255, 255, 255, 0.62) !important;
    --scalar-color-3: rgba(255, 255, 255, 0.44) !important;
    --scalar-color-accent: #3070ec !important;
    --scalar-background-1: #09090b !important;
    --scalar-background-2: #18181b !important;
    --scalar-background-3: #27272a !important;
    --scalar-border-color: rgba(255, 255, 255, 0.1) !important;
  }
  html[data-scalar-theme="dark"],
  html[data-scalar-theme="dark"] body,
  html[data-scalar-theme="dark"] #app {
    background: #09090b !important;
    color: rgba(255,255,255,0.9) !important;
    color-scheme: dark !important;
  }
`

const LIGHT_MODE_CSS = `
  html[data-scalar-theme="light"],
  html[data-scalar-theme="light"] body,
  html[data-scalar-theme="light"] #app,
  html[data-scalar-theme="light"] .light-mode,
  html[data-scalar-theme="light"] .dark-mode,
  html[data-scalar-theme="light"] * {
    --scalar-color-1: #1b1b1b !important;
    --scalar-color-2: #757575 !important;
    --scalar-color-3: #8e8e8e !important;
    --scalar-color-accent: #3070ec !important;
    --scalar-background-1: #fff !important;
    --scalar-background-2: #fafafa !important;
    --scalar-background-3: #e7e7e7 !important;
    --scalar-border-color: rgba(0, 0, 0, 0.1) !important;
  }
  html[data-scalar-theme="light"],
  html[data-scalar-theme="light"] body,
  html[data-scalar-theme="light"] #app {
    background: #fff !important;
    color: #1b1b1b !important;
    color-scheme: light !important;
  }
`

export async function GET(request: Request) {
  const url = new URL(request.url)
  const themeParam = url.searchParams.get('theme') || 'light'
  const isDark = themeParam === 'dark'

  const scalarTheme = (isDark ? 'moon' : 'default') as 'moon' | 'default'

  const config = {
    theme: scalarTheme,
    darkMode: isDark,
    hideDarkModeToggle: true,
    layout: 'modern' as const,
    showSidebar: true,
    hideSearch: false,
    searchHotKey: 'k' as const,
    sources: [
      {
        url: '/api/openapi.json',
        agent: { disabled: true },
      },
    ],
    customCss: `
      ${isDark ? DARK_MODE_CSS : LIGHT_MODE_CSS}
      /* Search dialog backdrop - transparent */
      .bg-backdrop {
        background: rgba(0, 0, 0, 0) !important;
      }
      /* Sidebar layout */
      .t-doc__sidebar > div:first-child,
      .refs-sidebar .refs-sidebar-header,
      [data-slot="sidebar-header"] {
        display: flex !important;
        flex-direction: column !important;
        gap: 8px !important;
        align-items: stretch !important;
      }
      .t-doc__sidebar .sidebar-search-key,
      .refs-sidebar [data-slot="sidebar-search"] {
        width: 100% !important;
      }
    `,
  }

  const THEME_LISTENER_SCRIPT = `
  <script>
    (function() {
      window.addEventListener('message', function(event) {
        if (event.data.type === 'theme') {
          const theme = event.data.theme;
          const isDark = theme === 'dark';
          
          document.documentElement.setAttribute('data-scalar-theme', isDark ? 'dark' : 'light');
          
          let styleEl = document.getElementById('scalar-theme-style');
          if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'scalar-theme-style';
            document.head.appendChild(styleEl);
          }
          
          styleEl.textContent = isDark ? \`${DARK_MODE_CSS}\` : \`${LIGHT_MODE_CSS}\`;
        }
        
        if (event.data.type === 'open-search') {
          const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
          const evt = new KeyboardEvent('keydown', {
            key: 'k',
            code: 'KeyK',
            metaKey: isMac,
            ctrlKey: !isMac,
            bubbles: true,
          });
          document.dispatchEvent(evt);
        }
      });
    })();
  </script>
  `
  const handler = ApiReference(config)
  const response = await handler()
  const html = await response.text()

  const themeAttr = isDark ? 'dark' : 'light'
  const htmlWithTheme = html
    .replace('<html>', `<html data-scalar-theme="${themeAttr}">`)
    .replace('</body>', `${THEME_LISTENER_SCRIPT}</body>`)

  return new Response(htmlWithTheme, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      Pragma: 'no-cache',
    },
  })
}
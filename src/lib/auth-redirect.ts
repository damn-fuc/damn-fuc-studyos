export function buildAuthRedirectUrl(origin: string, appBasePath: string): string {
  const pathWithoutRouterState = appBasePath.split(/[?#]/, 1)[0] || '/'
  const normalizedPath = pathWithoutRouterState.startsWith('/')
    ? pathWithoutRouterState
    : `/${pathWithoutRouterState}`
  const rootPath = normalizedPath.endsWith('/') ? normalizedPath : `${normalizedPath}/`

  return new URL(rootPath, origin.endsWith('/') ? origin : `${origin}/`).toString()
}

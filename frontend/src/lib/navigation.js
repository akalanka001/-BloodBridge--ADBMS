export const PUBLIC_NAV = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About us' },
  { id: 'camps', label: 'Find Camps' },
];

export const ROLE_PAGES = {
  DONOR: { id: 'donor', label: 'Donor Portal' },
  HOSPITAL_STAFF: { id: 'hospital', label: 'Hospital Portal' },
  BANK_STAFF: { id: 'bank', label: 'Blood Bank Portal' },
  ADMIN: { id: 'admin', label: 'Admin Portal' },
};

/**
 * Returns permissible navigation links based on user authentication and role.
 * NEVER exposes role-preview tabs in public nav.
 */
export const getNavItems = (user = null) => {
  const items = [...PUBLIC_NAV];
  if (user && user.role && ROLE_PAGES[user.role]) {
    items.push({
      id: ROLE_PAGES[user.role].id,
      label: 'Dashboard',
    });
  }
  return items;
};

// Legacy PAGES export for backward compatibility in imports, but strictly filtered when rendered
export const PAGES = PUBLIC_NAV;

export const navigate = (page) => {
  window.location.hash = page;
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

export const ALL_AUTH_ROUTES = [
  'login',
  'signup',
  'forgot-password',
  'reset-password',
  'verify-email',
  'accept-invite',
];

export const ALL_PORTAL_ROUTES = ['donor', 'hospital', 'bank', 'admin'];

export const startingPage = () => {
  const hash = window.location.hash.slice(1).split('?')[0];
  if (PUBLIC_NAV.some((item) => item.id === hash)) return hash;
  if (ALL_AUTH_ROUTES.includes(hash)) return hash;
  if (ALL_PORTAL_ROUTES.includes(hash)) return hash;
  return 'home';
};

/**
 * Validates if the current user can access the target route.
 * Returns { allowed: boolean, redirect: string, reason?: string }
 */
export const checkRouteAccess = (targetPage, user = null) => {
  if (PUBLIC_NAV.some((item) => item.id === targetPage)) {
    return { allowed: true };
  }

  if (ALL_AUTH_ROUTES.includes(targetPage)) {
    // If already logged in, redirect away from login/signup to their role dashboard
    if (user && ['login', 'signup'].includes(targetPage)) {
      const target = ROLE_PAGES[user.role]?.id || 'home';
      return { allowed: false, redirect: target, reason: 'Already signed in' };
    }
    return { allowed: true };
  }

  if (ALL_PORTAL_ROUTES.includes(targetPage)) {
    if (!user) {
      return { allowed: false, redirect: 'login', reason: 'Authentication required' };
    }

    const expectedRole = Object.keys(ROLE_PAGES).find(
      (role) => ROLE_PAGES[role].id === targetPage,
    );

    if (user.role !== expectedRole && user.role !== 'ADMIN') {
      const allowedHome = ROLE_PAGES[user.role]?.id || 'home';
      return {
        allowed: false,
        redirect: allowedHome,
        reason: 'Insufficient permissions for this portal',
      };
    }

    return { allowed: true };
  }

  return { allowed: true };
};

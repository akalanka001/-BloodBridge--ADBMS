export const PAGES = [
  { id: 'home', label: 'Home' },
  { id: 'camps', label: 'Find Camps' },
  { id: 'donor', label: 'Donor' },
  { id: 'hospital', label: 'Hospital' },
  { id: 'bank', label: 'Blood Bank' },
  { id: 'admin', label: 'Admin' },
];

export const navigate = (page) => {
  window.location.hash = page;
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

export const startingPage = () => {
  const hash = window.location.hash.slice(1);
  if (PAGES.some(page => page.id === hash)) return hash;
  if (['signup', 'login'].includes(hash)) return hash;
  return 'home';
};

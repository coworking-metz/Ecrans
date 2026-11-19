// SSO via le plugin WP OAuth Server de coworking-metz.fr (implicit flow)
const WP = "https://www.coworking-metz.fr";
const CLIENT_ID = import.meta.env.VITE_APP_OAUTH_CLIENT_ID || "sPc3emNadubEC0U073yC9I2vYdCe3WjkkOjuxhas";
const KEY = "auth_wp";

const redirectUri = () => window.location.origin + "/";

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && s.token && s.expires > Date.now()) return s;
  } catch {}
  localStorage.removeItem(KEY);
  return null;
}

export function logout() {
  localStorage.removeItem(KEY);
  window.location.href = "/";
}

export function login() {
  const state = crypto.randomUUID();
  sessionStorage.setItem("oauth_state", state);
  sessionStorage.setItem("oauth_return", window.location.pathname + window.location.search);
  const p = new URLSearchParams({
    response_type: "token",
    client_id: CLIENT_ID,
    redirect_uri: redirectUri(),
    state,
  });
  window.location.href = `${WP}/oauth/authorize?${p}`;
}

/** Retourne l'utilisateur connecté (admin WP) ou null. Gère le retour d'OAuth. */
export async function checkAuth() {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  if (hash.get("access_token")) {
    const ok = hash.get("state") === sessionStorage.getItem("oauth_state");
    const back = sessionStorage.getItem("oauth_return") || "/";
    history.replaceState(null, "", back);
    sessionStorage.removeItem("oauth_state");
    if (!ok) throw new Error("state invalide");
    const token = hash.get("access_token");
    const res = await fetch(`${WP}/oauth/me/`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error("Échec de la récupération du profil");
    const me = await res.json();
    const isAdmin = (me.user_roles || []).includes("administrator") || me.capabilities?.manage_options;
    if (!isAdmin) throw new Error("Accès réservé aux administrateurs");
    const expires = Date.now() + (parseInt(hash.get("expires_in")) || 3600) * 1000;
    localStorage.setItem(KEY, JSON.stringify({ token, expires, name: me.display_name }));
  }
  return load();
}

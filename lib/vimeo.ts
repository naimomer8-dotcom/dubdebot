/**
 * Read-only Vimeo client (VIMEO_ACCESS_TOKEN: scopes public, private, video_files).
 * The token never leaves the server.
 */
const API = "https://api.vimeo.com";

export type VimeoVideo = {
  id: string; name: string; description: string | null; duration: number; link: string;
  embed_url: string | null; privacy: string | null; thumb: string | null; texttracks: number; vimeo_created_at: string | null;
};

function token() {
  const t = process.env.VIMEO_ACCESS_TOKEN;
  if (!t) throw new Error("VIMEO_ACCESS_TOKEN not set");
  return t;
}

async function get(path: string) {
  const res = await fetch(path.startsWith("http") ? path : `${API}${path}`, {
    headers: { Authorization: `bearer ${token()}`, Accept: "application/vnd.vimeo.*+json;version=3.4" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`vimeo ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

type Raw = {
  uri: string; name: string; description: string | null; duration: number; link: string; player_embed_url?: string;
  privacy?: { view?: string }; created_time?: string; pictures?: { base_link?: string };
  metadata?: { connections?: { texttracks?: { total?: number } } };
};

const FIELDS = "uri,name,description,duration,link,player_embed_url,privacy.view,created_time,pictures.base_link,metadata.connections.texttracks.total";

/** Every video in the account, newest first (pages of 100). */
export async function listAllVideos(maxPages = 30): Promise<VimeoVideo[]> {
  const out: VimeoVideo[] = [];
  let next: string | null = `/me/videos?per_page=100&sort=date&direction=desc&fields=${FIELDS}`;
  for (let p = 0; next && p < maxPages; p++) {
    const page: { data: Raw[]; paging?: { next?: string | null } } = await get(next);
    for (const v of page.data ?? []) {
      out.push({
        id: v.uri.split("/").pop() ?? v.uri,
        name: v.name,
        description: v.description,
        duration: v.duration,
        link: v.link,
        embed_url: v.player_embed_url ?? null,
        privacy: v.privacy?.view ?? null,
        thumb: v.pictures?.base_link ?? null,
        texttracks: v.metadata?.connections?.texttracks?.total ?? 0,
        vimeo_created_at: v.created_time ?? null,
      });
    }
    next = page.paging?.next ?? null;
  }
  return out;
}

/** Quick check that the token works: the account name, without listing anything. */
export async function whoAmI(): Promise<string> {
  const me = await get("/me?fields=name");
  return String(me.name ?? "");
}

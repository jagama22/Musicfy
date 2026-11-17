// Servidor Subsonic FALSO para desarrollar y probar Musicfy sin tocar el Navidrome real.
// Uso:  node dev/mock-subsonic.mjs   →  http://localhost:4533
// Credenciales de prueba (solo este mock):  usuario «demo», contraseña «demo».
import http from 'node:http';
import crypto from 'node:crypto';

const PORT = Number(process.env.PORT ?? 4533);
const USER = 'demo';
const PASS = 'demo';

// ---------- Datos de ejemplo ----------
const genres = ['Rock', 'Pop', 'Electrónica', 'Indie', 'Jazz', 'Hip-Hop'];
const artistNames = ['Los Ecos', 'Marea Alta', 'Neón Sur', 'Clara Vidal', 'The Lanterns', 'Bruma', 'Kilómetro Cero', 'Sofía Rayo'];
const words = ['Noche', 'Luz', 'Camino', 'Ciudad', 'Mar', 'Fuego', 'Silencio', 'Viento', 'Eco', 'Horizonte', 'Sombra', 'Verano', 'Ruido', 'Cristal', 'Lluvia', 'Norte'];
const pick = (arr, i) => arr[i % arr.length];

const artists = artistNames.map((name, i) => ({ id: `ar${i + 1}`, name, coverArt: `ar-ar${i + 1}`, albumCount: 0 }));
const albums = [];
const songs = [];
let songN = 1;
artists.forEach((ar, ai) => {
  const n = 2 + (ai % 2);
  for (let k = 0; k < n; k++) {
    const id = `al${albums.length + 1}`;
    const genre = pick(genres, ai + k);
    const year = 2012 + ((ai * 3 + k * 4) % 13);
    const name = `${pick(words, ai * 3 + k)} ${pick(words, ai + k * 5 + 7)}`;
    const album = { id, name, artist: ar.name, artistId: ar.id, coverArt: id, year, genre, created: new Date(2024, ai, k + 1).toISOString(), songCount: 0, duration: 0, playCount: (ai * 7 + k * 13) % 40 };
    const count = 6 + ((ai + k) % 6);
    for (let t = 1; t <= count; t++) {
      const duration = 20; // la pista de prueba dura 20 s
      songs.push({ id: `s${songN++}`, title: `${pick(words, songN * 3)} ${pick(['de', 'en', 'sin', 'y'], songN)} ${pick(words, songN * 7 + 1)}`, album: name, albumId: id, artist: ar.name, artistId: ar.id, coverArt: id, duration, track: t, discNumber: 1, year, genre, suffix: 'wav', bitRate: 128, playCount: (songN * 17) % 50, isDir: false, type: 'music' });
      album.songCount++;
      album.duration += duration;
    }
    albums.push(album);
    ar.albumCount++;
  }
});

const starred = { song: new Set(['s1', 's5', 's9', 's14', 's22', 's31']), album: new Set(['al2', 'al5']), artist: new Set(['ar3']) };
let playlists = [
  { id: 'pl1', name: 'Para correr', owner: USER, public: false, comment: 'Ritmo constante', songIds: ['s2', 's7', 's12', 's18', 's25', 's33', 's40'], created: '2025-03-01T10:00:00Z' },
  { id: 'pl2', name: 'Domingo tranquilo', owner: USER, public: false, comment: '', songIds: ['s3', 's11', 's20', 's27'], created: '2025-06-10T10:00:00Z' },
];
let plCounter = 3;
let playQueue = null;

const songById = (id) => songs.find((s) => s.id === id);
const withStar = (s) => (starred.song.has(s.id) ? { ...s, starred: '2025-01-01T00:00:00Z' } : s);
const plOut = (p, withEntries) => {
  const entry = p.songIds.map(songById).filter(Boolean).map(withStar);
  const out = { id: p.id, name: p.name, owner: p.owner, public: p.public, comment: p.comment, songCount: entry.length, duration: entry.reduce((a, s) => a + s.duration, 0), created: p.created, changed: p.changed ?? p.created, coverArt: entry[0]?.coverArt };
  return withEntries ? { ...out, entry } : out;
};
const shuffle = (a) => [...a].sort(() => Math.random() - 0.5);

// ---------- Medios ----------
function colorFor(key) {
  const h = [...crypto.createHash('md5').update(key).digest()].slice(0, 3);
  return `rgb(${h[0] % 200 + 30},${h[1] % 200 + 30},${h[2] % 200 + 30})`;
}
function coverSvg(id) {
  const label = id.startsWith('ar-') ? (artists.find((a) => `ar-${a.id}` === id)?.name ?? '?') : (albums.find((a) => a.id === id)?.name ?? '?');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${colorFor(id)}"/><stop offset="1" stop-color="${colorFor(id + 'x')}"/></linearGradient></defs><rect width="600" height="600" fill="url(#g)"/><circle cx="460" cy="140" r="90" fill="rgba(255,255,255,0.18)"/><text x="40" y="540" font-family="Arial" font-weight="bold" font-size="56" fill="#fff">${label.replace(/&/g, '&amp;')}</text></svg>`;
}
function toneWav(seed, seconds = 20, rate = 8000) {
  const n = seconds * rate;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  const notes = [261.6, 293.7, 329.6, 349.2, 392.0, 440.0, 493.9];
  for (let i = 0; i < n; i++) {
    const f = notes[(seed + Math.floor(i / (rate / 2))) % notes.length];
    const env = 0.5 - 0.5 * Math.cos((2 * Math.PI * (i % (rate / 2))) / (rate / 2));
    buf.writeInt16LE(Math.round(Math.sin((2 * Math.PI * f * i) / rate) * 6000 * env), 44 + i * 2);
  }
  return buf;
}

// ---------- API ----------
function handle(method, q) {
  switch (method) {
    case 'ping': return {};
    case 'getAlbumList2': {
      const size = Number(q.get('size') ?? 10);
      const off = Number(q.get('offset') ?? 0);
      let list = [...albums];
      switch (q.get('type')) {
        case 'random': list = shuffle(list); break;
        case 'newest': list.sort((a, b) => b.created.localeCompare(a.created)); break;
        case 'frequent': list.sort((a, b) => b.playCount - a.playCount); break;
        case 'recent': list = list.filter((_, i) => i % 2 === 0); break;
        case 'starred': list = list.filter((a) => starred.album.has(a.id)); break;
        case 'byGenre': list = list.filter((a) => a.genre === q.get('genre')); break;
        default: list.sort((a, b) => a.name.localeCompare(b.name));
      }
      return { albumList2: { album: list.slice(off, off + size) } };
    }
    case 'getAlbum': {
      const al = albums.find((a) => a.id === q.get('id'));
      if (!al) throw [70, 'Álbum no encontrado'];
      return { album: { ...al, starred: starred.album.has(al.id) ? '2025-01-01T00:00:00Z' : undefined, song: songs.filter((s) => s.albumId === al.id).map(withStar) } };
    }
    case 'getArtists':
      return { artists: { index: [{ name: '#', artist: artists.map((a) => ({ ...a, starred: starred.artist.has(a.id) ? '2025-01-01T00:00:00Z' : undefined })) }] } };
    case 'getArtist': {
      const ar = artists.find((a) => a.id === q.get('id'));
      if (!ar) throw [70, 'Artista no encontrado'];
      return { artist: { ...ar, album: albums.filter((a) => a.artistId === ar.id) } };
    }
    case 'getArtistInfo2': {
      const ar = artists.find((a) => a.id === q.get('id'));
      return { artistInfo2: { biography: `${ar?.name} es un grupo de prueba generado por el servidor mock de Musicfy. Su música es una sucesión de tonos muy relajantes.`, similarArtist: shuffle(artists.filter((a) => a.id !== ar?.id)).slice(0, 5) } };
    }
    case 'getTopSongs': {
      const list = songs.filter((s) => s.artist === q.get('artist')).sort((a, b) => b.playCount - a.playCount);
      return { topSongs: { song: list.slice(0, Number(q.get('count') ?? 10)).map(withStar) } };
    }
    case 'getSimilarSongs2':
    case 'getRandomSongs': {
      const g = q.get('genre');
      const list = shuffle(songs.filter((s) => !g || s.genre === g));
      const size = Number(q.get('count') ?? q.get('size') ?? 20);
      return method === 'getRandomSongs' ? { randomSongs: { song: list.slice(0, size).map(withStar) } } : { similarSongs2: { song: list.slice(0, size).map(withStar) } };
    }
    case 'getGenres':
      return { genres: { genre: genres.map((g) => ({ value: g, songCount: songs.filter((s) => s.genre === g).length, albumCount: albums.filter((a) => a.genre === g).length })) } };
    case 'getSongsByGenre':
      return { songsByGenre: { song: songs.filter((s) => s.genre === q.get('genre')).map(withStar) } };
    case 'search3': {
      const t = (q.get('query') ?? '').toLowerCase().replace(/"/g, '');
      const m = (s) => s.toLowerCase().includes(t);
      return { searchResult3: { artist: artists.filter((a) => m(a.name)), album: albums.filter((a) => m(a.name) || m(a.artist)), song: songs.filter((s) => m(s.title) || m(s.artist)).slice(0, Number(q.get('songCount') ?? 20)).map(withStar) } };
    }
    case 'getStarred2':
      return { starred2: { song: songs.filter((s) => starred.song.has(s.id)).map(withStar), album: albums.filter((a) => starred.album.has(a.id)).map((a) => ({ ...a, starred: '2025-01-01T00:00:00Z' })), artist: artists.filter((a) => starred.artist.has(a.id)).map((a) => ({ ...a, starred: '2025-01-01T00:00:00Z' })) } };
    case 'star':
    case 'unstar': {
      const op = method === 'star' ? 'add' : 'delete';
      q.getAll('id').forEach((id) => starred.song[op](id));
      q.getAll('albumId').forEach((id) => starred.album[op](id));
      q.getAll('artistId').forEach((id) => starred.artist[op](id));
      return {};
    }
    case 'getPlaylists': return { playlists: { playlist: playlists.map((p) => plOut(p, false)) } };
    case 'getPlaylist': {
      const p = playlists.find((x) => x.id === q.get('id'));
      if (!p) throw [70, 'Playlist no encontrada'];
      return { playlist: plOut(p, true) };
    }
    case 'createPlaylist': {
      const existing = playlists.find((x) => x.id === q.get('playlistId'));
      if (existing) {
        existing.songIds = q.getAll('songId');
        existing.changed = new Date().toISOString();
        return { playlist: plOut(existing, true) };
      }
      const p = { id: `pl${plCounter++}`, name: q.get('name') ?? 'Nueva playlist', owner: USER, public: false, comment: '', songIds: q.getAll('songId'), created: new Date().toISOString() };
      playlists.push(p);
      return { playlist: plOut(p, true) };
    }
    case 'updatePlaylist': {
      const p = playlists.find((x) => x.id === q.get('playlistId'));
      if (!p) throw [70, 'Playlist no encontrada'];
      if (q.get('name')) p.name = q.get('name');
      if (q.has('comment')) p.comment = q.get('comment');
      const rm = new Set(q.getAll('songIndexToRemove').map(Number));
      p.songIds = p.songIds.filter((_, i) => !rm.has(i)).concat(q.getAll('songIdToAdd'));
      p.changed = new Date().toISOString();
      return {};
    }
    case 'deletePlaylist':
      playlists = playlists.filter((p) => p.id !== q.get('id'));
      return {};
    case 'scrobble': return {};
    case 'savePlayQueue':
      playQueue = { ids: q.getAll('id'), current: q.get('current'), position: Number(q.get('position') ?? 0) };
      return {};
    case 'getPlayQueue':
      return playQueue ? { playQueue: { current: playQueue.current, position: playQueue.position, entry: playQueue.ids.map(songById).filter(Boolean) } } : {};
    default:
      throw [0, `Método no soportado por el mock: ${method}`];
  }
}

http
  .createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    const m = url.pathname.match(/^\/rest\/(\w+?)(\.view)?$/);
    if (!m) { res.writeHead(404); return res.end('not found'); }
    const method = m[1];
    const q = url.searchParams;
    const authed = q.get('u') === USER && q.get('t') === crypto.createHash('md5').update(PASS + (q.get('s') ?? '')).digest('hex');
    const send = (body) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 'subsonic-response': { status: 'ok', version: '1.16.1', type: 'mock', ...body } }));
    };
    const fail = (code, message) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 'subsonic-response': { status: 'failed', version: '1.16.1', error: { code, message } } }));
    };
    if (!authed) return fail(40, 'Wrong username or password');
    if (method === 'getCoverArt') {
      res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'max-age=3600' });
      return res.end(coverSvg(q.get('id') ?? ''));
    }
    if (method === 'stream') {
      const wav = toneWav(Number((q.get('id') ?? 's0').slice(1)) || 0);
      res.writeHead(200, { 'Content-Type': 'audio/wav', 'Content-Length': wav.length, 'Accept-Ranges': 'none' });
      return res.end(wav);
    }
    try {
      send(handle(method, q));
    } catch (e) {
      if (Array.isArray(e)) fail(e[0], e[1]);
      else fail(0, String(e));
    }
    console.log(method, q.get('id') ?? q.get('type') ?? q.get('query') ?? '');
  })
  .listen(PORT, () => console.log(`Mock Subsonic en http://localhost:${PORT}  (usuario: ${USER} / contraseña: ${PASS})`));

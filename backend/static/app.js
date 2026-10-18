/* Aurora Music — original responsive interface inspired by modern music players. */
const $ = (selector) => document.querySelector(selector);
const audio = $('#audio');
const radioAudio = $('#radioAudio'); // independent stream: Web Audio EQ on local files must not mute cross-origin radios
function loadMiniMix(){try{return {...{youtube:false,apple:false,spotify:false},...JSON.parse(localStorage.getItem('aurora_mini_mix')||'{}')};}catch{return {youtube:false,apple:false,spotify:false};}}
const state = {
  tracks: [], playlists: [], queue: [], currentId: null, currentIndex: -1,
  view: 'home', playlistId: null, shuffle: false, repeat: 'off',
  theme: localStorage.getItem('aurora_theme') || 'glass',
  miniStyle: localStorage.getItem('aurora_mini_style') || 'spotify',
  miniMix: loadMiniMix(),
  recentTracks: [],
  profile: localStorage.getItem('aurora_profile') || 'original',
  target: 'browser', tab: 'queue', lyrics: [], lyricsMeta: {}, lyricsLoading: false,
  startOffset: 0, sleepTimer: null, eq: {bass:0, mid:0, treble:0},
  eqReady:false, eqContext:null, remotePaused:true,
  radio: {country:localStorage.getItem('aurora_radio_country')||'AR', countries:[],stations:[],favorites:[],loadedFor:null,loading:false, playing:null,query:'', showFavorites:false},
};
const profiles = [
 ['original','Original · Sin conversión'],['mp3_128','MP3 · 128 kbps'],['mp3_192','MP3 · 192 kbps'],['mp3_320','MP3 · 320 kbps'],
 ['aac_128','M4A / AAC · 128 kbps'],['aac_256','M4A / AAC · 256 kbps'],
 ['opus_24','Tipo Spotify Baja · Opus 24 kbps'],['ogg_96','Tipo Spotify Normal · Vorbis 96 kbps'],
 ['ogg_160','Tipo Spotify Alta · Vorbis 160 kbps'],['ogg_320','Tipo Spotify Muy alta · Vorbis 320 kbps'],
 ['flac','FLAC · Sin pérdida (desde original)']
];
function escapeHtml(x) { return String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function fmt(s) { const n=Math.max(0,Math.floor(Number(s)||0)); return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`; }
function track(id) { return state.tracks.find(t=>t.id===id); }
function cover(id,klass='small-cover') { return `<img class="${klass}" loading="lazy" src="/api/cover/${encodeURIComponent(id)}" alt="" onerror="this.style.display='none';this.parentElement.classList.add('art-placeholder')">`; }
function toast(message) { const el=$('#toast'); el.textContent=message; el.style.display='block'; clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.style.display='none',4000); }
async function api(path, options={}) { const r=await fetch(path,{...options,headers:{...(options.body?{'Content-Type':'application/json'}:{}),...(options.headers||{})}}); if(!r.ok){const p=await r.json().catch(()=>({})); throw new Error(p.detail||`Error ${r.status}`);} return r.status===204?{}:r.json(); }
async function post(path, body) { return api(path,{method:'POST',body:JSON.stringify(body)}); }
function setTheme(theme){ state.theme=theme;document.body.dataset.theme=theme;localStorage.setItem('aurora_theme',theme); }
function applyMiniStyle(){document.body.dataset.miniStyle=state.miniStyle;for(const style of ['youtube','apple','spotify'])document.body.dataset[`mini${style[0].toUpperCase()}${style.slice(1)}`]=String(!!state.miniMix[style]);}
function currentSeconds(){return state.startOffset+(Number.isFinite(audio.currentTime)?audio.currentTime:0);}
function playProfileUrl(id,offset=0) { return `/api/stream/${encodeURIComponent(id)}?profile=${encodeURIComponent(state.profile)}&start=${encodeURIComponent(offset)}`; }
function setArt(el,id){ const target=$(el);target.innerHTML=id?cover(id,'full-cover'):'♫'; }
function setView(v,id=null){state.view=v;state.playlistId=id;document.querySelectorAll('.nav-btn').forEach(n=>n.classList.toggle('active',n.dataset.view===v));$('#search').value='';$('#search').placeholder=v==='radio'?'Buscar emisoras desde la sección Radios…':'Buscar canciones, artistas, álbumes…';render();if(v==='radio')loadRadio();if(v==='settings')loadRadioCountries();document.querySelector('.sidebar').classList.remove('open');}
async function refreshLibrary() {const data=await api('/api/library?limit=5000');state.tracks=data.items;const lists=await api('/api/playlists');state.playlists=lists.items;render();updatePlayer();}
function searchableRows(items){const q=$('#search').value.trim().toLowerCase();return q?items.filter(t=>[t.title,t.artist,t.album,t.genre].some(x=>x.toLowerCase().includes(q))):items;}
function albumsFrom(tracks){const map=new Map();for(const t of tracks){const key=`${t.artist}\x00${t.album}`;if(!map.has(key))map.set(key,{artist:t.artist,album:t.album,tracks:[],coverId:t.id});map.get(key).tracks.push(t);}return [...map.values()];}
function renderAlbums(items){return `<div class="album-grid">${albumsFrom(items).slice(0,12).map((a,i)=>`<div class="album-card" data-album="${i}"><div class="album-art art-placeholder">${cover(a.coverId,'album-img')}</div><h3>${escapeHtml(a.album)}</h3><p>${escapeHtml(a.artist)}</p></div>`).join('')}</div>`;}
function renderTrackTable(items){if(!items.length)return `<div class="empty"><h3>Todavía no hay canciones acá</h3><p>Agregá archivos a la carpeta de música y actualizá la biblioteca.</p></div>`;
 return `<table class="track-table"><thead><tr><th>Canción</th><th>Álbum</th><th>Duración</th><th></th></tr></thead><tbody>${items.map(t=>`<tr class="${state.currentId===t.id?'current':''}">
 <td><div class="track-name" data-play="${t.id}"><div class="small-cover art-placeholder">${cover(t.id)}</div><div><b>${escapeHtml(t.title)}</b><small>${escapeHtml(t.artist)}</small></div></div></td>
 <td class="muted">${escapeHtml(t.album)}</td><td class="muted">${fmt(t.duration)}</td>
 <td><div class="track-actions"><button class="icon-btn" data-favorite="${t.id}" title="Favoritas">${t.favorite?'♥':'♡'}</button><button class="icon-btn" data-add="${t.id}" title="Agregar a playlist">＋</button><button class="icon-btn" data-queue="${t.id}" title="Agregar a la cola">⋯</button></div></td></tr>`).join('')}</tbody></table>`;
}
function radioStation(id){return [...state.radio.stations,...state.radio.favorites].find(r=>r.stationuuid===id);}
function stationCard(r){
 const favorite=state.radio.favorites.some(f=>f.stationuuid===r.stationuuid);
 const playing=state.radio.playing?.stationuuid===r.stationuuid;
 const icon=r.favicon?`<img class="radio-logo" src="${escapeHtml(r.favicon)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display='none'">`:'<span class="radio-placeholder">♫</span>';
 return `<div class="radio-card ${playing?'radio-active':''}"><button class="radio-station" data-radioplay="${escapeHtml(r.stationuuid)}" aria-label="Escuchar ${escapeHtml(r.name)}">${icon}<span class="radio-info"><b>${escapeHtml(r.name)}</b><small>${escapeHtml(r.countrycode||'')} · ${escapeHtml(r.codec||'Audio')} ${r.bitrate?`· ${Number(r.bitrate)} kbps`:''}</small></span><span aria-hidden="true">${playing?'◖◖':'▶'}</span></button><button class="radio-fav icon-btn" title="${favorite?'Quitar de favoritas':'Agregar a favoritas'}" data-radiofav="${escapeHtml(r.stationuuid)}">${favorite?'♥':'♡'}</button></div>`;
}
function renderRadio(){
 const r=state.radio, out=$('#content');
 const options=r.countries.length?r.countries.map(c=>`<option value="${escapeHtml(c.code)}">${escapeHtml(c.name)} (${c.stations})</option>`).join(''):`<option value="${escapeHtml(r.country)}">${escapeHtml(r.country)} — país actual</option>`;
 const list=r.showFavorites?r.favorites:r.stations;
 out.innerHTML=`<div class="eyebrow">RADIO EN VIVO</div><h1 class="page-title">Radios del mundo</h1><p class="page-sub">Explorá emisoras por país sin abandonar tu biblioteca local. Las transmisiones pertenecen a sus respectivas emisoras.</p>
 <div class="options-card"><div class="radio-filters"><label>País<select class="select" id="radioCountry">${options}</select></label><label>Buscar emisora<input class="text-input" id="radioQuery" maxlength="80" placeholder="Nombre de la radio" value="${escapeHtml(r.query)}"></label><button class="pill-btn" id="radioSearchBtn">⌕ Buscar</button></div><div class="button-row"><button class="soft-btn ${!r.showFavorites?'selected':''}" id="radioAllBtn">Todas</button><button class="soft-btn ${r.showFavorites?'selected':''}" id="radioFavBtn">♥ Favoritas (${r.favorites.length})</button><button class="soft-btn" id="radioRefreshBtn">⟳ Actualizar</button></div></div>
 <div class="section-header"><h2>${r.showFavorites?'Mis radios favoritas':'Emisoras disponibles'}</h2><span class="muted">${list.length} emisoras</span></div>
 ${r.loading?'<p class="muted">Consultando el directorio…</p>':list.length?`<div class="radio-grid">${list.map(stationCard).join('')}</div>`:'<div class="empty">No encontramos emisoras. Probá otro país o buscá por nombre.</div>'}
 <p class="muted radio-footnote">Directorio: Radio Browser. Algunas emisoras pueden estar caídas o emitir en formatos incompatibles con el navegador. Escucharlas consume datos de Internet.</p>`;
 $('#radioCountry').value=r.country;
}
async function loadRadioCountries(){
 if(state.radio.countries.length)return;
 try{const data=await api('/api/radio/countries');state.radio.countries=data.items;if(state.view==='settings')render();}catch(e){toast('Países: '+e.message);}
}
async function loadRadio(force=false){
 const r=state.radio;if(r.loading)return;
 if(!force && r.loadedFor===`${r.country}:${r.query}`){if(state.view==='radio')renderRadio();return;}
 r.loading=true;if(state.view==='radio')renderRadio();
 try{
   const requests=[api(`/api/radio/stations?country=${encodeURIComponent(r.country)}&q=${encodeURIComponent(r.query)}`),api('/api/radio/favorites')];
   if(!r.countries.length)requests.push(api('/api/radio/countries'));
   const result=await Promise.all(requests);r.stations=result[0].items;r.favorites=result[1].items;
   if(result[2])r.countries=result[2].items;
   r.loadedFor=`${r.country}:${r.query}`;
 }catch(e){toast('Radios: '+e.message);}finally{r.loading=false;if(state.view==='radio')renderRadio();}
}
async function playRadio(id){
 const station=radioStation(id);if(!station)return toast('No se encontró la radio');
 // Radio streams are played by the client. Casting radio stations needs a separate, tested OwnTone integration.
 if(state.target!=='browser'){await post('/api/cast/control/pause',{}).catch(()=>{});state.target='browser';}
 audio.pause();radioAudio.pause();state.radio.playing=station;state.currentId=null;state.startOffset=0;state.queue=[];state.lyrics=[];
 radioAudio.src=station.url;radioAudio.load();updatePlayer();renderRail();
 try{await radioAudio.play();}catch(e){toast('No se pudo abrir esta transmisión: '+e.message);}
}
async function favoriteRadio(id){
 const station=radioStation(id);if(!station)return;
 const found=state.radio.favorites.some(x=>x.stationuuid===id);
 try{if(found){await api(`/api/radio/favorites/${encodeURIComponent(id)}`,{method:'DELETE'});state.radio.favorites=state.radio.favorites.filter(x=>x.stationuuid!==id);}
 else{await post('/api/radio/favorites',station);state.radio.favorites.push(station);}if(state.view==='radio')renderRadio();updatePlayer();}
 catch(e){toast(e.message);}
}
function render(){ if(state.view==='radio'){renderRadio();return;}const out=$('#content'); const q=$('#search').value.trim();let items=searchableRows(state.tracks);let title='', subtitle='';
 if(q){title='Resultados';subtitle=`Coincidencias en tu biblioteca local · ${items.length} canciones`;out.innerHTML=`<div class="eyebrow">Buscar</div><h1 class="page-title">${title}</h1><p class="page-sub">${subtitle}</p>${renderTrackTable(items)}`;return;}
 if(state.view==='home'){
  out.innerHTML=`<div class="hero"><div><div class="eyebrow" style="color:#ffdce9">TU MÚSICA, TUS REGLAS</div><h1>Todo tu sonido.<br>A tu manera.</h1><p>Biblioteca propia, máxima calidad y reproducción en tus dispositivos.</p><button class="pill-btn" id="heroPlay">▶ Escuchar música</button></div><div class="hero-orb"></div></div>
   <div class="section-header"><h2>Álbumes de tu biblioteca</h2><span class="muted">${albumsFrom(items).length} álbumes</span></div>${renderAlbums(items)}
   <div class="section-header"><h2>Tus canciones</h2><span class="muted">${items.length} canciones</span></div>${renderTrackTable(items.slice(0,35))}`;
 } else if(state.view==='all'||state.view==='favorites'||state.view==='recent'){
  title=state.view==='all'?'Tu biblioteca':state.view==='favorites'?'Tus favoritas':'Escuchadas recientemente';
  if(state.view==='favorites')items=items.filter(t=>t.favorite);
  if(state.view==='recent') {items=state.recentTracks; }
  out.innerHTML=`<div class="eyebrow">Colección</div><h1 class="page-title">${title}</h1><p class="page-sub">${items.length} canciones · Podés ordenarlas y reproducirlas</p>${renderTrackTable(items)}`;
 }else if(state.view==='playlists'){
  out.innerHTML=`<div class="eyebrow">Tus colecciones</div><h1 class="page-title">Playlists</h1><p class="page-sub">Creá listas y organizá tu música, al estilo SimpMusic.</p><div class="button-row"><button class="pill-btn" id="newPlaylist">＋ Nueva playlist</button></div><div class="options-card">${state.playlists.length?state.playlists.map(p=>`<div class="playlist-row"><b data-openplaylist="${p.id}">♫ &nbsp;${escapeHtml(p.name)}</b><button data-delplaylist="${p.id}" class="icon-btn" title="Eliminar">×</button></div>`).join(''):'<p class="muted">No creaste ninguna playlist todavía.</p>'}</div>`;
 }else if(state.view==='playlist'){
  const p=state.playlists.find(x=>x.id===state.playlistId);out.innerHTML=`<div class="eyebrow">Playlist personal</div><h1 class="page-title">${escapeHtml(p?.name||'Playlist')}</h1><p class="page-sub">Tu selección de música</p><div id="playlistSongs" class="loading">Cargando…</div>`;
  api(`/api/playlists/${state.playlistId}`).then(({items})=>{$('#playlistSongs').innerHTML=renderTrackTable(items);state.activePlaylistTracks=items.map(x=>x.id);}).catch(e=>toast(e.message));
 }else if(state.view==='settings'){
  out.innerHTML=`<div class="eyebrow">Personalizar</div><h1 class="page-title">Ajustes</h1><p class="page-sub">Diseñá tu experiencia de música.</p>
   <div class="options-card"><h3>Interfaz</h3><p class="muted">Alterná sin interrumpir la música.</p><div class="form-row"><label>Apariencia<select id="themeSelect" class="select"><option value="glass">Liquid Glass · Inspiración Apple Music</option><option value="material">Material 3 · Inspiración Google</option></select></label><label>Idioma<select id="languageSelect" class="select">${AuroraI18n.languages.map(([code,name])=>`<option value="${code}">${name}</option>`).join('')}</select></label></div><p class="muted">El idioma se guarda en este navegador o en la app.</p></div>
   <div class="options-card"><h3>Mini reproductor</h3><p class="muted">Elegí un diseño o combiná detalles de varios estilos. La preferencia se guarda en este navegador o en la app.</p><div class="form-row"><label>Estilo principal<select id="miniStyleSelect" class="select"><option value="spotify">Spotify · compacto</option><option value="youtube">YouTube Music · color de portada</option><option value="apple">Apple Music · cristal</option><option value="custom">Personalizado · combinación</option></select></label></div><div class="mini-mix-options"><label><input type="checkbox" id="miniMixSpotify"> Botones compactos de Spotify</label><label><input type="checkbox" id="miniMixYoutube"> Fondo con color de YouTube Music</label><label><input type="checkbox" id="miniMixApple"> Cristal translúcido de Apple Music</label></div></div>
   <div class="options-card"><h3>Calidad de transmisión al navegador</h3><p class="muted">FFmpeg convierte durante la reproducción sin modificar los originales. En AirPlay y Chromecast, OwnTone negocia el formato compatible.</p><div class="form-row"><label>Formato y calidad<select id="profileSelect" class="select">${profiles.map(([v,n])=>`<option value="${v}">${escapeHtml(n)}</option>`).join('')}</select></label></div><p class="muted">M4A/AAC y Ogg no funcionan en todos los navegadores. En iPhone probá AAC o MP3 si no reproduce. El modo original requiere que el navegador admita ese archivo.</p></div>
   <div class="options-card"><h3>Biblioteca y dispositivos</h3><p class="muted">La música permanece en la carpeta configurada. Los controles de AirPlay/Chromecast requieren que el receptor esté accesible desde la Raspberry.</p><div class="button-row"><button id="scanSettings" class="soft-btn">⟳ Escanear biblioteca</button><button id="deviceSettings" class="soft-btn">▣ Ver parlantes</button></div></div>
   <div class="options-card"><h3>Radios online</h3><p class="muted">Elegí el país predeterminado para explorar emisoras. También podés cambiarlo desde la sección Radios.</p><div class="form-row"><label>País de las radios<select id="radioCountrySetting" class="select">${state.radio.countries.length?state.radio.countries.map(c=>`<option value="${escapeHtml(c.code)}">${escapeHtml(c.name)}</option>`).join(''):`<option value="${escapeHtml(state.radio.country)}">${escapeHtml(state.radio.country)} (actual)</option>`}</select></label></div></div>
   <div class="options-card"><h3>Otras funciones</h3><p class="muted">Favoritos, playlists, letras .lrc y búsqueda automática en LRCLIB, ecualizador web, temporizador, cola, aleatorio y repetir. Descubrimiento musical, podcasts, YouTube Music y Android Auto requieren desarrollos adicionales.</p></div>`;
  $('#themeSelect').value=state.theme;$('#languageSelect').value=AuroraI18n.getLanguage();$('#profileSelect').value=state.profile;$('#radioCountrySetting').value=state.radio.country;$('#miniStyleSelect').value=state.miniStyle;for(const k of ['spotify','youtube','apple'])$(`#miniMix${k[0].toUpperCase()}${k.slice(1)}`).checked=!!state.miniMix[k];
 }
}
async function renderRecent(){ if(state.view!=='recent')return;try{const r=await api('/api/library?view=recent&limit=5000');state.recentTracks=r.items;$('#content').innerHTML=`<div class="eyebrow">Historial</div><h1 class="page-title">Escuchadas recientemente</h1><p class="page-sub">${r.items.length} canciones</p>${renderTrackTable(searchableRows(r.items))}`;}catch(e){toast(e.message);} }
function queueFromView(){ const q=$('#search').value.trim();if(q) return searchableRows(state.tracks).map(t=>t.id);if(state.view==='favorites')return state.tracks.filter(t=>t.favorite).map(t=>t.id);if(state.view==='recent')return state.recentTracks.map(t=>t.id);if(state.view==='playlist')return state.activePlaylistTracks||[];return state.tracks.map(t=>t.id); }
async function playSong(id,queue=null){const t=track(id);if(!t){toast('No se encontró esa canción');return;}radioAudio.pause();radioAudio.removeAttribute('src');state.radio.playing=null;if(queue){state.queue=[...queue];}else if(!state.queue.includes(id)){state.queue=queueFromView();if(!state.queue.includes(id))state.queue.push(id);}state.currentId=id;state.currentIndex=state.queue.indexOf(id);state.startOffset=0;updatePlayer();renderRail();render();
 try{if(state.target==='browser'){audio.pause();audio.src=playProfileUrl(id);audio.load();await audio.play();} else {audio.pause();audio.removeAttribute('src');await post(`/api/cast/play/${encodeURIComponent(id)}`,{});state.remotePaused=false;updatePlayer();}
 await post('/api/history',{id});await updateLyrics();}catch(e){toast('No se pudo reproducir: '+(e.message||e));}
}
async function playPause(){if(state.radio.playing){if(radioAudio.paused)radioAudio.play().catch(e=>toast(e.message));else radioAudio.pause();updatePlayer();return;}if(!state.currentId){if(state.tracks.length)playSong(state.tracks[0].id);else toast('Tu biblioteca está vacía');return;}
 if(state.target!=='browser'){try{const action=state.remotePaused?'play':'pause';await post(`/api/cast/control/${action}`,{});state.remotePaused=!state.remotePaused;updatePlayer();}catch(e){toast(e.message);}return;}
 if(audio.paused)audio.play().catch(e=>toast(e.message));else audio.pause();updatePlayer(); }
function nextTrack(back=false){if(state.radio.playing)return;if(!state.queue.length)return;let idx=state.currentIndex;if(state.shuffle&&!back){idx=Math.floor(Math.random()*state.queue.length);}else{idx+=back?-1:1;if(idx>=state.queue.length){if(state.repeat==='all')idx=0;else {audio.pause();updatePlayer();return;}}if(idx<0)idx=state.repeat==='all'?state.queue.length-1:0;}playSong(state.queue[idx]);}
function updatePlayer(){const r=state.radio.playing;document.body.classList.toggle('has-media',!!r||!!state.currentId);if(r){$('#playerTitle').textContent=r.name;$('#playerArtist').textContent=`Radio en vivo · ${r.countrycode||''}`;$('#railTitle').textContent=r.name;$('#railArtist').textContent='Radio en vivo';$('#playerArt').innerHTML=r.favicon?`<img class="full-cover" src="${escapeHtml(r.favicon)}" alt="">`:'♫';$('#railArt').innerHTML=r.favicon?`<img class="full-cover" src="${escapeHtml(r.favicon)}" alt="">`:'♫';$('#play').textContent=radioAudio.paused?'▶':'Ⅱ';$('[data-mobile-action="play"]').textContent=radioAudio.paused?'▶':'Ⅱ';$('#heartBtn').textContent=state.radio.favorites.some(f=>f.stationuuid===r.stationuuid)?'♥':'♡';$('#elapsed').textContent='●';$('#duration').textContent='EN VIVO';$('#mobileElapsed').textContent='●';$('#mobileDuration').textContent='EN VIVO';$('#seek').disabled=true;$('#mobileSeek').disabled=true;return;}$('#seek').disabled=false;$('#mobileSeek').disabled=false;const t=track(state.currentId);$('#playerTitle').textContent=t?.title||'Biblioteca lista';$('#playerArtist').textContent=t?.artist||'Agregá música para comenzar';$('#railTitle').textContent=t?.title||'Nada sonando';$('#railArtist').textContent=t?.artist||'Elegí una canción para empezar';setArt('#playerArt',state.currentId);setArt('#railArt',state.currentId);
 $('#play').textContent=(state.target==='browser'?audio.paused:state.remotePaused)?'▶':'Ⅱ';$('#heartBtn').textContent=t?.favorite?'♥':'♡';$('#shuffle').classList.toggle('on',state.shuffle);$('#repeat').classList.toggle('on',state.repeat!=='off');$('#repeat').title='Repetir: '+state.repeat;
 const playing=(state.target==='browser'?audio.paused:state.remotePaused);$('[data-mobile-action="play"]').textContent=playing?'▶':'Ⅱ';$('#duration').textContent=fmt(t?.duration||0);$('#elapsed').textContent=fmt(state.target==='browser'?currentSeconds():0);$('#mobileDuration').textContent=fmt(t?.duration||0);$('#mobileElapsed').textContent=fmt(state.target==='browser'?currentSeconds():0);$('#mobileSeek').value=$('#seek').value; }
async function updateLyrics(refresh=false){
 const id=state.currentId;if(!id)return;
 state.lyricsLoading=true;state.lyrics=[];state.lyricsMeta={};if(state.tab==='lyrics')renderRail();
 try{
  const data=await api(`/api/lyrics/${id}${refresh?'?refresh=true':''}`);
  if(id!==state.currentId)return;
  state.lyrics=data.lines||[];state.lyricsMeta=data;
  if(data.error)toast(data.error);
 }catch(e){if(id!==state.currentId)return;state.lyrics=[];state.lyricsMeta={error:e.message};}
 finally{if(id===state.currentId){state.lyricsLoading=false;if(state.tab==='lyrics'){renderRail();updateProgress();}}}
}
function renderRail(){document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x.dataset.tab===state.tab));const el=$('#railBody');
 if(state.tab==='queue'){el.innerHTML=state.queue.length?state.queue.map((id,i)=>{const t=track(id);return t?`<div class="queue-item ${id===state.currentId?'current':''}" data-queueplay="${i}"><span class="number">${i+1}</span><div><b>${escapeHtml(t.title)}</b><small>${escapeHtml(t.artist)}</small></div></div>`:'';}).join(''):'<p class="muted">Todavía no hay música en la cola.</p>';
 }else if(state.tab==='lyrics'){
  const source=state.lyricsMeta.source?`<small class="muted">Fuente: ${escapeHtml(state.lyricsMeta.source)}${state.lyricsMeta.cached?' · caché':''}</small>`:'';
  const actions=state.currentId?`<div class="lyrics-tools"><button class="soft-btn" data-lyrics-refresh="1" title="Volver a consultar LRCLIB">⟳ Actualizar</button><button class="soft-btn" data-lyrics-search="1">⌕ Otra versión</button></div>`:'';
  const body=state.lyricsLoading?'<p class="muted">Buscando letras…</p>':
     state.lyrics.length?state.lyrics.map((line,i)=>`<div class="lyrics-line" data-lyric="${i}" data-time="${line.t??-1}">${escapeHtml(line.text)||'♪'}</div>`).join(''):
     `<p class="muted">${escapeHtml(state.lyricsMeta.error || 'No se encontraron letras. Podés buscar otra versión o agregar un archivo .lrc local.')}</p>`;
  el.innerHTML=`${actions}${source}${body}`;
 
 }else{el.innerHTML='<p class="muted">Buscando dispositivos AirPlay y Chromecast…</p>';api('/api/cast/outputs').then(result=>{if(state.tab!=='devices')return;el.innerHTML=`<div class="device-item ${state.target==='browser'?'active':''}" data-output="browser"><span>◉</span><div><b>Este navegador</b><small>Calidad seleccionada en Ajustes</small></div></div>${(result.outputs||[]).filter(x=>['AirPlay','Chromecast'].includes(x.type)).map(x=>`<div class="device-item ${state.target===String(x.id)?'active':''}" data-output="${escapeHtml(x.id)}"><span>${x.type==='AirPlay'?'◌':'▣'}</span><div><b>${escapeHtml(x.name)}</b><small>${escapeHtml(x.type)}${x.requires_auth?' · Requiere emparejar':''}</small></div></div>`).join('')||'<p class="muted">No se detectaron parlantes. Revisá mDNS, la misma LAN y OwnTone.</p>'}`;}).catch(e=>{el.innerHTML=`<p class="muted">${escapeHtml(e.message)}</p>`;}); }
}
function switchTab(tab){state.tab=tab;renderRail();$('#rightRail').classList.add('open','now-playing');document.body.classList.add('player-open');if(tab==='lyrics'&&state.currentId&&!state.lyrics.length&&!state.lyricsLoading&&!state.lyricsMeta.source)updateLyrics();}
async function chooseOutput(id){try{if(id==='browser'){if(state.target!=='browser')await api('/api/cast/control/stop',{method:'POST'}).catch(()=>{});state.target='browser';state.remotePaused=true;toast('Salida: este navegador');if(state.currentId)await playSong(state.currentId);}
 else{await post('/api/cast/outputs',{output_ids:[String(id)]});state.target=String(id);audio.pause();toast('Parlante seleccionado. Reproducí una canción.');if(state.currentId)await playSong(state.currentId);}
 renderRail();updatePlayer();}catch(e){toast(e.message);}}
async function toggleFavorite(id){try{const data=await post('/api/favorite',{id});const t=track(id);if(t)t.favorite=data.favorite?1:0;render();updatePlayer();}catch(e){toast(e.message);}}
function modal(title,body){$('#modalContent').innerHTML=`<h2>${escapeHtml(title)}</h2>${body}`;$('#modal').hidden=false;}
function hideModal(){$('#modal').hidden=true;}
async function openLyricsSearch(){
 if(!state.currentId)return;
 const id=state.currentId;
 modal('Elegir letras sincronizadas',`<p class="muted">Si la letra no coincide, buscá por artista y canción. Se consultará LRCLIB.</p><div class="form-row"><input id="lyricsQuery" class="text-input" maxlength="120" value="${escapeHtml(`${track(id)?.artist||''} ${track(id)?.title||''}`)}" placeholder="Artista y canción"><button id="lyricsSearchGo" class="soft-btn">Buscar</button></div><div id="lyricsMatches" class="muted">Buscando…</div>`);
 await searchLyricsCandidates();
}
async function searchLyricsCandidates(){
 const id=state.currentId, query=$('#lyricsQuery')?.value.trim()||'';
 const out=$('#lyricsMatches');if(!out)return;out.textContent='Buscando…';
 try{
  const {items}=await api(`/api/lyrics/${encodeURIComponent(id)}/search?q=${encodeURIComponent(query)}`);
  if(id!==state.currentId||!$('#lyricsMatches'))return;
  out.innerHTML=items.length?items.map(x=>`<div class="playlist-row"><div><b>${escapeHtml(x.title)}</b><small class="muted">${escapeHtml(x.artist)} · ${escapeHtml(x.album)} · ${fmt(x.duration)} · ${x.synced?'Sincronizada':'Texto'}</small></div><button class="soft-btn" data-lyrics-select="${x.id}">Elegir</button></div>`).join(''):'<p>No se encontraron coincidencias. Probá otra búsqueda.</p>';
 }catch(e){if($('#lyricsMatches'))out.textContent=e.message;}
}
function choosePlaylist(id){modal('Agregar a una playlist',state.playlists.length?`<div class="options-card">${state.playlists.map(p=>`<div class="playlist-row"><b data-addto="${p.id}" data-trackid="${id}">${escapeHtml(p.name)} ＋</b></div>`).join('')}</div>`:'<p class="muted">Primero creá una playlist desde el menú.</p>');}
function newPlaylist(){modal('Nueva playlist','<input class="text-input" id="playlistName" maxlength="80" placeholder="Nombre de la playlist"><div class="button-row"><button id="savePlaylist" class="pill-btn">Crear playlist</button></div>');$('#playlistName').focus();}
function sleepTimer(){modal('Temporizador de apagado',`<p class="muted">Pausar la reproducción después de:</p><div class="button-row">${[5,15,30,45,60].map(m=>`<button class="soft-btn" data-sleep="${m}">${m} min</button>`).join('')}<button class="soft-btn" data-sleep="0">Cancelar</button></div>`);}
async function setupEQ(){if(state.eqReady)return;try{const ctx=new (window.AudioContext||window.webkitAudioContext)();const source=ctx.createMediaElementSource(audio);const bass=ctx.createBiquadFilter();bass.type='lowshelf';bass.frequency.value=200;const mid=ctx.createBiquadFilter();mid.type='peaking';mid.frequency.value=1200;mid.Q.value=.9;const treble=ctx.createBiquadFilter();treble.type='highshelf';treble.frequency.value=4500;source.connect(bass).connect(mid).connect(treble).connect(ctx.destination);state.eqNodes={bass,mid,treble};state.eqContext=ctx;state.eqReady=true;Object.keys(state.eq).forEach(k=>state.eqNodes[k].gain.value=state.eq[k]);await ctx.resume();}catch(e){toast('Ecualizador no disponible: '+e.message);}}
function eqModal(){modal('Ecualizador del navegador',`<p class="muted">Afecta a la reproducción web, no a AirPlay/Chromecast.</p><div class="sliders">${[['bass','Graves'],['mid','Medios'],['treble','Agudos']].map(([k,n])=>`<label>${n} <span id="eqVal_${k}">${state.eq[k]} dB</span><input type="range" min="-12" max="12" value="${state.eq[k]}" data-eq="${k}"></label>`).join('')}</div><button class="soft-btn" id="resetEQ">Restablecer ecualizador</button>`);setupEQ();}
function beginSeek(seconds){if(!state.currentId||state.target!=='browser')return;const pos=Math.max(0,Math.min(seconds,track(state.currentId)?.duration||0));if(state.profile==='original'&&Number.isFinite(audio.duration)){audio.currentTime=pos;}else{const shouldPlay=!audio.paused;state.startOffset=pos;audio.src=playProfileUrl(state.currentId,pos);audio.load();if(shouldPlay)audio.play().catch(e=>toast(e.message));}updateProgress();}
function updateProgress(){if(state.radio.playing)return;const t=track(state.currentId);if(!t)return;const current=currentSeconds();const len=t.duration||0;$('#elapsed').textContent=fmt(current);$('#duration').textContent=fmt(len);$('#mobileElapsed').textContent=fmt(current);$('#mobileDuration').textContent=fmt(len);if(document.activeElement!==$('#seek'))$('#seek').value=String(len?Math.min(100,current/len*100):0);if(document.activeElement!==$('#mobileSeek'))$('#mobileSeek').value=$('#seek').value;
 if(state.tab==='lyrics'){const lines=[...document.querySelectorAll('.lyrics-line[data-time]')];let active=-1;lines.forEach((el,i)=>{const v=parseFloat(el.dataset.time);if(v>=0&&v<=current)active=i;el.classList.toggle('active',i===active);});}
}
async function refresh(){try{toast('Escaneando… puede tardar');await post('/api/scan',{});await refreshLibrary();toast('Biblioteca actualizada');}catch(e){toast(e.message);}}
// Delegated UI clicks
$('#content').addEventListener('click',async(e)=>{const btn=e.target.closest('button,[data-play],[data-album],[data-openplaylist],[data-delplaylist]');if(!btn)return;
 if(btn.dataset.radioplay){await playRadio(btn.dataset.radioplay);return;}
 if(btn.dataset.radiofav){await favoriteRadio(btn.dataset.radiofav);return;}
 if(btn.id==='radioSearchBtn'){state.radio.query=($('#radioQuery')?.value||'').trim();state.radio.showFavorites=false;await loadRadio(true);return;}
 if(btn.id==='radioAllBtn'){state.radio.showFavorites=false;renderRadio();return;}
 if(btn.id==='radioFavBtn'){state.radio.showFavorites=true;renderRadio();return;}
 if(btn.id==='radioRefreshBtn'){await loadRadio(true);return;}
 if(btn.dataset.play){await playSong(btn.dataset.play,queueFromView());return;}
 if(btn.dataset.favorite){toggleFavorite(btn.dataset.favorite);return;}
 if(btn.dataset.add){choosePlaylist(btn.dataset.add);return;}
 if(btn.dataset.queue){state.queue.push(btn.dataset.queue);toast('Agregada a la cola');renderRail();return;}
 if(btn.dataset.album!==undefined){const a=albumsFrom(state.tracks)[Number(btn.dataset.album)];if(a)playSong(a.tracks[0].id,a.tracks.map(t=>t.id));return;}
 if(btn.dataset.openplaylist){setView('playlist',Number(btn.dataset.openplaylist));return;}
 if(btn.dataset.delplaylist){if(confirm('¿Eliminar esta playlist?')){await api(`/api/playlists/${btn.dataset.delplaylist}`,{method:'DELETE'});await refreshLibrary();}return;}
 if(btn.id==='newPlaylist')return newPlaylist();
 if(btn.id==='heroPlay'){if(state.tracks.length)playSong(state.tracks[0].id,queueFromView());return;}
 if(btn.id==='scanSettings')return refresh();if(btn.id==='deviceSettings')return switchTab('devices');
});
$('#nav').addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(b){setView(b.dataset.view);if(b.dataset.view==='recent')renderRecent();}});
document.querySelectorAll('.sidebar [data-view]').forEach(b=>b.addEventListener('click',()=>{setView(b.dataset.view);if(b.dataset.view==='recent')renderRecent();}));
$('#search').addEventListener('input',()=>{if(state.view!=='radio')render();});
$('#content').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='radioQuery')$('#radioSearchBtn')?.click();});
$('#content').addEventListener('change',e=>{if(e.target.id==='languageSelect'){AuroraI18n.setLanguage(e.target.value);render();renderRail();updatePlayer();return;}if(e.target.id==='radioCountrySetting'){state.radio.country=e.target.value;localStorage.setItem('aurora_radio_country',state.radio.country);state.radio.loadedFor=null;toast('País de radios actualizado');return;}if(e.target.id==='radioCountry'){state.radio.country=e.target.value;localStorage.setItem('aurora_radio_country',state.radio.country);state.radio.showFavorites=false;loadRadio(true);return;}if(e.target.id==='themeSelect')setTheme(e.target.value);if(e.target.id==='profileSelect'){state.profile=e.target.value;localStorage.setItem('aurora_profile',state.profile);toast('Perfil actualizado para reproducción web');if(state.currentId&&state.target==='browser'){const p=currentSeconds();const running=!audio.paused;state.startOffset=p;audio.src=playProfileUrl(state.currentId,p);audio.load();if(running)audio.play().catch(err=>toast(err.message));}}});
$('#content').addEventListener('change',e=>{if(e.target.id==='miniStyleSelect'){state.miniStyle=e.target.value;localStorage.setItem('aurora_mini_style',state.miniStyle);applyMiniStyle();toast('Estilo del mini reproductor actualizado');return;}if(e.target.id?.startsWith('miniMix')){const k=e.target.id.slice(7).toLowerCase();if(['spotify','youtube','apple'].includes(k)){state.miniMix[k]=e.target.checked;localStorage.setItem('aurora_mini_mix',JSON.stringify(state.miniMix));applyMiniStyle();}}});
$('#themeBtn').addEventListener('click',()=>{setTheme(state.theme==='glass'?'material':'glass');if(state.view==='settings')render();toast(`Tema ${state.theme==='glass'?'Liquid Glass':'Material 3'}`);});
$('#rescan').addEventListener('click',refresh);$('#menuBtn').addEventListener('click',()=>document.querySelector('.sidebar').classList.toggle('open'));
$('#closeRail').addEventListener('click',()=>{$('#rightRail').classList.remove('open','now-playing');document.body.classList.remove('player-open');});
$('#playerTrack').addEventListener('click',e=>{if(e.target.closest('#heartBtn'))return;switchTab('queue');});
$('#playerTrack').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();switchTab('queue');}});
$('#play').addEventListener('click',playPause);$('#next').addEventListener('click',()=>nextTrack());$('#prev').addEventListener('click',()=>nextTrack(true));
$('#shuffle').addEventListener('click',()=>{state.shuffle=!state.shuffle;updatePlayer();});
$('#repeat').addEventListener('click',()=>{state.repeat=state.repeat==='off'?'all':state.repeat==='all'?'single':'off';updatePlayer();toast('Repetir: '+state.repeat);});
$('#heartBtn').addEventListener('click',()=>{if(state.radio.playing)favoriteRadio(state.radio.playing.stationuuid);else if(state.currentId)toggleFavorite(state.currentId);});
$('#queueBtn').addEventListener('click',()=>switchTab('queue'));$('#devicesBtn').addEventListener('click',()=>switchTab('devices'));
$('#rightRail').addEventListener('click',e=>{const action=e.target.closest('[data-mobile-action]')?.dataset.mobileAction;if(!action)return;if(action==='play')playPause();if(action==='next')nextTrack();if(action==='prev')nextTrack(true);});
$('#mobileSeek').addEventListener('input',()=>{$('#seek').value=$('#mobileSeek').value;});$('#mobileSeek').addEventListener('change',e=>{const len=track(state.currentId)?.duration||0;if(len)beginSeek(len*Number(e.target.value)/100);});
$('#sleepBtn').addEventListener('click',sleepTimer);$('#eqBtn').addEventListener('click',eqModal);
$('#railBody').addEventListener('click',e=>{if(e.target.closest('[data-lyrics-refresh]')){updateLyrics(true);return;}if(e.target.closest('[data-lyrics-search]')){openLyricsSearch();return;}const q=e.target.closest('[data-queueplay]');if(q){const id=state.queue[Number(q.dataset.queueplay)];if(id)playSong(id);return;}const d=e.target.closest('[data-output]');if(d)chooseOutput(d.dataset.output);});
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.tab)));
$('#volume').addEventListener('input',e=>{audio.volume=Number(e.target.value)/100;radioAudio.volume=audio.volume;});audio.volume=.8;radioAudio.volume=.8;
$('#seek').addEventListener('change',e=>{const len=track(state.currentId)?.duration||0;if(len)beginSeek(len*Number(e.target.value)/100);});
$('#modalClose').addEventListener('click',hideModal);$('#modal').addEventListener('click',e=>{if(e.target.id==='modal')hideModal();});
$('#modalContent').addEventListener('click',async e=>{const b=e.target.closest('button,[data-addto]');if(!b)return;try{
 if(b.id==='lyricsSearchGo'){await searchLyricsCandidates();return;}
 if(b.dataset.lyricsSelect){const chosen=await post(`/api/lyrics/${encodeURIComponent(state.currentId)}/select`,{lrclib_id:Number(b.dataset.lyricsSelect)});state.lyrics=chosen.lines||[];state.lyricsMeta=chosen;hideModal();switchTab('lyrics');updateProgress();toast('Letra actualizada');return;}
 if(b.dataset.addto){await post(`/api/playlists/${b.dataset.addto}/tracks`,{track_id:b.dataset.trackid});hideModal();toast('Agregada a playlist');}
 if(b.id==='savePlaylist'){const name=$('#playlistName').value.trim();if(!name)return;await post('/api/playlists',{name});hideModal();await refreshLibrary();toast('Playlist creada');}
 if(b.dataset.sleep!==undefined){clearTimeout(state.sleepTimer);const mins=Number(b.dataset.sleep);if(mins)state.sleepTimer=setTimeout(()=>{if(state.target==='browser')audio.pause();else post('/api/cast/control/pause',{}).catch(()=>{});updatePlayer();toast('Temporizador finalizado');},mins*60*1000);hideModal();toast(mins?`Se pausará en ${mins} minutos`:'Temporizador cancelado');}
 if(b.id==='resetEQ'){Object.keys(state.eq).forEach(k=>{state.eq[k]=0;if(state.eqReady)state.eqNodes[k].gain.value=0;});eqModal();}
 }catch(err){toast(err.message);}});
$('#modalContent').addEventListener('input',e=>{const k=e.target.dataset.eq;if(!k)return;state.eq[k]=Number(e.target.value);if(state.eqReady)state.eqNodes[k].gain.value=state.eq[k];$(`#eqVal_${k}`).textContent=`${state.eq[k]} dB`;});
radioAudio.addEventListener('play',updatePlayer);radioAudio.addEventListener('pause',updatePlayer);
radioAudio.addEventListener('error',()=>{if(state.radio.playing)toast('Esta radio no está disponible o no es compatible. Probá otra.');});
audio.addEventListener('play',async()=>{if(state.eqContext?.state==='suspended')await state.eqContext.resume();updatePlayer();});
audio.addEventListener('pause',updatePlayer);audio.addEventListener('timeupdate',updateProgress);audio.addEventListener('loadedmetadata',updateProgress);
audio.addEventListener('ended',()=>{if(state.radio.playing)return;if(state.repeat==='single'){playSong(state.currentId);return;}nextTrack();});
audio.addEventListener('error',()=>{if(state.target==='browser'&&state.currentId)toast('Este formato no se pudo reproducir. Probá MP3 o AAC desde Ajustes.');});
window.addEventListener('keydown',e=>{if(e.code==='Space'&&!['INPUT','TEXTAREA','SELECT','BUTTON'].includes(document.activeElement?.tagName)&&$('#modal').hidden){e.preventDefault();playPause();}});
setTheme(state.theme);applyMiniStyle();refreshLibrary().catch(e=>{$('#content').innerHTML=`<div class="empty"><h3>No se pudo abrir la biblioteca</h3><p>${escapeHtml(e.message)}</p></div>`;});

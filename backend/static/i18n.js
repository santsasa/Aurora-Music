/* Client-side translations. The selection stays on this browser/WebView only. */
(() => {
  const languages = [
    ['es', 'Español'], ['en', 'English'], ['pt', 'Português'],
    ['fr', 'Français'], ['de', 'Deutsch'], ['it', 'Italiano']
  ];
  // Entries are ordered English, Portuguese, French, German, Italian.
  const messages = {
    'EXPLORAR': ['EXPLORE', 'EXPLORAR', 'EXPLORER', 'ENTDECKEN', 'ESPLORA'],
    'CONFIGURACIÓN': ['SETTINGS', 'CONFIGURAÇÕES', 'PARAMÈTRES', 'EINSTELLUNGEN', 'IMPOSTAZIONI'],
    'Inicio': ['Home', 'Início', 'Accueil', 'Startseite', 'Home'],
    'Biblioteca': ['Library', 'Biblioteca', 'Bibliothèque', 'Bibliothek', 'Libreria'],
    'Radios online': ['Online radio', 'Rádios online', 'Radios en ligne', 'Online-Radio', 'Radio online'],
    'Favoritas': ['Favorites', 'Favoritas', 'Favoris', 'Favoriten', 'Preferiti'],
    'Escuchadas': ['Recently played', 'Ouvidas', 'Écoutées', 'Gehört', 'Ascoltate'],
    'Ajustes': ['Settings', 'Configurações', 'Paramètres', 'Einstellungen', 'Impostazioni'],
    'Tu biblioteca privada': ['Your private library', 'Sua biblioteca privada', 'Votre bibliothèque privée', 'Deine private Bibliothek', 'La tua libreria privata'],
    'Reproduciendo': ['Now playing', 'Reproduzindo', 'Lecture en cours', 'Wiedergabe', 'In riproduzione'],
    'Nada sonando': ['Nothing playing', 'Nada tocando', 'Aucune lecture', 'Keine Wiedergabe', 'Nessuna riproduzione'],
    'Elegí una canción para empezar': ['Choose a song to begin', 'Escolha uma música para começar', 'Choisissez un titre pour commencer', 'Wähle einen Titel aus', 'Scegli un brano per iniziare'],
    'Cola': ['Queue', 'Fila', "File d'attente", 'Warteschlange', 'Coda'],
    'Letra': ['Lyrics', 'Letra', 'Paroles', 'Liedtext', 'Testo'],
    'Dispositivos': ['Devices', 'Dispositivos', 'Appareils', 'Geräte', 'Dispositivi'],
    'Calidad de audio': ['Audio quality', 'Qualidade de áudio', 'Qualité audio', 'Audioqualität', 'Qualità audio'],
    'Detener': ['Stop', 'Parar', 'Arrêter', 'Stopp', 'Ferma'],
    'Calidad de audio': ['Audio quality', 'Qualidade de áudio', 'Qualité audio', 'Audioqualität', 'Qualità audio'],
    'Detener': ['Stop', 'Parar', 'Arrêter', 'Stopp', 'Ferma'],
    'Tu cola está vacía.': ['Your queue is empty.', 'Sua fila está vazia.', "Votre file d'attente est vide.", 'Deine Warteschlange ist leer.', 'La tua coda è vuota.'],
    'Biblioteca lista': ['Library ready', 'Biblioteca pronta', 'Bibliothèque prête', 'Bibliothek bereit', 'Libreria pronta'],
    'Agregá música para comenzar': ['Add music to get started', 'Adicione músicas para começar', 'Ajoutez de la musique pour commencer', 'Füge Musik hinzu, um loszulegen', 'Aggiungi musica per iniziare'],
    'Buscar canciones, artistas, álbumes…': ['Search songs, artists, albums…', 'Buscar músicas, artistas, álbuns…', 'Rechercher titres, artistes, albums…', 'Songs, Künstler, Alben suchen…', 'Cerca brani, artisti, album…'],
    'Buscar emisoras desde la sección Radios…': ['Search stations in Online radio…', 'Busque estações em Rádios online…', 'Cherchez des stations dans Radios en ligne…', 'Sender unter Online-Radio suchen…', 'Cerca stazioni in Radio online…'],
    'Buscar música': ['Search music', 'Buscar música', 'Rechercher de la musique', 'Musik suchen', 'Cerca musica'],
    'Actualizar biblioteca': ['Refresh library', 'Atualizar biblioteca', 'Actualiser la bibliothèque', 'Bibliothek aktualisieren', 'Aggiorna libreria'],
    'Cambiar apariencia': ['Change appearance', 'Alterar aparência', "Changer l'apparence", 'Darstellung ändern', 'Cambia aspetto'],
    'Menú': ['Menu', 'Menu', 'Menu', 'Menü', 'Menu'],
    'Favoritos': ['Favorites', 'Favoritos', 'Favoris', 'Favoriten', 'Preferiti'],
    'Aleatorio': ['Shuffle', 'Aleatório', 'Aléatoire', 'Zufällig', 'Casuale'],
    'Anterior': ['Previous', 'Anterior', 'Précédent', 'Zurück', 'Precedente'],
    'Reproducir': ['Play', 'Reproduzir', 'Lire', 'Abspielen', 'Riproduci'],
    'Siguiente': ['Next', 'Próximo', 'Suivant', 'Weiter', 'Successivo'],
    'Repetir': ['Repeat', 'Repetir', 'Répéter', 'Wiederholen', 'Ripeti'],
    'Progreso': ['Progress', 'Progresso', 'Progression', 'Fortschritt', 'Avanzamento'],
    'Temporizador': ['Sleep timer', 'Temporizador', 'Minuteur', 'Sleep-Timer', 'Timer'],
    'Ecualizador': ['Equalizer', 'Equalizador', 'Égaliseur', 'Equalizer', 'Equalizzatore'],
    'Cola y letras': ['Queue and lyrics', 'Fila e letras', "File d'attente et paroles", 'Warteschlange und Liedtext', 'Coda e testi'],
    'Volumen': ['Volume', 'Volume', 'Volume', 'Lautstärke', 'Volume'],
    'Cargando tu biblioteca…': ['Loading your library…', 'Carregando sua biblioteca…', 'Chargement de votre bibliothèque…', 'Bibliothek wird geladen…', 'Caricamento della libreria…'],
    'Todavía no hay canciones acá': ['No songs here yet', 'Ainda não há músicas aqui', "Il n'y a pas encore de titres ici", 'Hier sind noch keine Songs', 'Non ci sono ancora brani qui'],
    'Agregá archivos a la carpeta de música y actualizá la biblioteca.': ['Add files to your music folder and refresh the library.', 'Adicione arquivos à pasta de músicas e atualize a biblioteca.', 'Ajoutez des fichiers au dossier de musique et actualisez la bibliothèque.', 'Füge Dateien zum Musikordner hinzu und aktualisiere die Bibliothek.', 'Aggiungi file alla cartella musicale e aggiorna la libreria.'],
    'Canción': ['Song', 'Música', 'Titre', 'Song', 'Brano'],
    'Álbum': ['Album', 'Álbum', 'Album', 'Album', 'Album'],
    'Duración': ['Duration', 'Duração', 'Durée', 'Dauer', 'Durata'],
    'Agregar a playlist': ['Add to playlist', 'Adicionar à playlist', 'Ajouter à une playlist', 'Zur Playlist hinzufügen', 'Aggiungi alla playlist'],
    'Agregar a la cola': ['Add to queue', 'Adicionar à fila', "Ajouter à la file d'attente", 'Zur Warteschlange hinzufügen', 'Aggiungi alla coda'],
    'Quitar de favoritas': ['Remove from favorites', 'Remover dos favoritos', 'Retirer des favoris', 'Aus Favoriten entfernen', 'Rimuovi dai preferiti'],
    'Agregar a favoritas': ['Add to favorites', 'Adicionar aos favoritos', 'Ajouter aux favoris', 'Zu Favoriten hinzufügen', 'Aggiungi ai preferiti'],
    'RADIO EN VIVO': ['LIVE RADIO', 'RÁDIO AO VIVO', 'RADIO EN DIRECT', 'LIVE-RADIO', 'RADIO IN DIRETTA'],
    'Radios del mundo': ['Radio around the world', 'Rádios do mundo', 'Radios du monde', 'Radio aus aller Welt', 'Radio dal mondo'],
    'Explorá emisoras por país sin abandonar tu biblioteca local. Las transmisiones pertenecen a sus respectivas emisoras.': ['Explore stations by country while keeping your local library. Streams belong to their respective stations.', 'Explore estações por país sem sair da biblioteca local. As transmissões pertencem às respectivas emissoras.', 'Explorez les stations par pays sans quitter votre bibliothèque. Les flux appartiennent à leurs stations respectives.', 'Entdecke Sender nach Land und behalte deine lokale Bibliothek. Streams gehören den jeweiligen Sendern.', 'Esplora le stazioni per paese senza lasciare la libreria locale. I flussi appartengono alle rispettive emittenti.'],
    'País': ['Country', 'País', 'Pays', 'Land', 'Paese'],
    'Buscar emisora': ['Search station', 'Buscar estação', 'Rechercher une station', 'Sender suchen', 'Cerca stazione'],
    'Nombre de la radio': ['Station name', 'Nome da rádio', 'Nom de la station', 'Sendername', 'Nome della stazione'],
    'Buscar': ['Search', 'Buscar', 'Rechercher', 'Suchen', 'Cerca'],
    'Todas': ['All', 'Todas', 'Toutes', 'Alle', 'Tutte'],
    'Actualizar': ['Refresh', 'Atualizar', 'Actualiser', 'Aktualisieren', 'Aggiorna'],
    'Mis radios favoritas': ['My favorite stations', 'Minhas rádios favoritas', 'Mes stations favorites', 'Meine Lieblingssender', 'Le mie stazioni preferite'],
    'Emisoras disponibles': ['Available stations', 'Estações disponíveis', 'Stations disponibles', 'Verfügbare Sender', 'Stazioni disponibili'],
    'Consultando el directorio…': ['Checking the directory…', 'Consultando o diretório…', "Consultation de l'annuaire…", 'Verzeichnis wird abgefragt…', 'Consultazione della directory…'],
    'No encontramos emisoras. Probá otro país o buscá por nombre.': ['No stations found. Try another country or search by name.', 'Nenhuma estação encontrada. Tente outro país ou busque pelo nome.', 'Aucune station trouvée. Essayez un autre pays ou recherchez par nom.', 'Keine Sender gefunden. Versuche ein anderes Land oder suche nach Namen.', 'Nessuna stazione trovata. Prova un altro paese o cerca per nome.'],
    'Directorio: Radio Browser. Algunas emisoras pueden estar caídas o emitir en formatos incompatibles con el navegador. Escucharlas consume datos de Internet.': ['Directory: Radio Browser. Some stations may be offline or use formats your browser cannot play. Listening uses internet data.', 'Diretório: Radio Browser. Algumas estações podem estar fora do ar ou usar formatos incompatíveis. Ouvir consome dados de Internet.', 'Annuaire : Radio Browser. Certaines stations peuvent être hors ligne ou utiliser des formats incompatibles. Leur écoute consomme des données Internet.', 'Verzeichnis: Radio Browser. Einige Sender sind möglicherweise offline oder verwenden inkompatible Formate. Das Hören verbraucht Internetdaten.', 'Directory: Radio Browser. Alcune stazioni potrebbero essere offline o usare formati incompatibili. L’ascolto consuma dati Internet.'],
    'Resultados': ['Results', 'Resultados', 'Résultats', 'Ergebnisse', 'Risultati'],
    'Buscar': ['Search', 'Buscar', 'Rechercher', 'Suchen', 'Cerca'],
    'TU MÚSICA, TUS REGLAS': ['YOUR MUSIC, YOUR RULES', 'SUA MÚSICA, SUAS REGRAS', 'VOTRE MUSIQUE, VOS RÈGLES', 'DEINE MUSIK, DEINE REGELN', 'LA TUA MUSICA, LE TUE REGOLE'],
    'Todo tu sonido.': ['All your sound.', 'Todo o seu som.', 'Tout votre son.', 'Dein ganzer Sound.', 'Tutta la tua musica.'],
    'A tu manera.': ['Your way.', 'Do seu jeito.', 'À votre façon.', 'Auf deine Art.', 'A modo tuo.'],
    'Biblioteca propia, máxima calidad y reproducción en tus dispositivos.': ['Your own library, top quality, and playback on your devices.', 'Sua biblioteca, máxima qualidade e reprodução nos seus dispositivos.', 'Votre bibliothèque, une qualité optimale et la lecture sur vos appareils.', 'Deine Bibliothek, beste Qualität und Wiedergabe auf deinen Geräten.', 'La tua libreria, massima qualità e riproduzione sui tuoi dispositivi.'],
    'Escuchar música': ['Play music', 'Ouvir música', 'Écouter de la musique', 'Musik hören', 'Ascolta musica'],
    'Álbumes de tu biblioteca': ['Albums in your library', 'Álbuns da sua biblioteca', 'Albums de votre bibliothèque', 'Alben in deiner Bibliothek', 'Album della tua libreria'],
    'Tus canciones': ['Your songs', 'Suas músicas', 'Vos titres', 'Deine Songs', 'I tuoi brani'],
    'Tu biblioteca': ['Your library', 'Sua biblioteca', 'Votre bibliothèque', 'Deine Bibliothek', 'La tua libreria'],
    'Tus favoritas': ['Your favorites', 'Suas favoritas', 'Vos favoris', 'Deine Favoriten', 'I tuoi preferiti'],
    'Escuchadas recientemente': ['Recently played', 'Ouvidas recentemente', 'Écoutées récemment', 'Kürzlich gehört', 'Ascoltati di recente'],
    'Colección': ['Collection', 'Coleção', 'Collection', 'Sammlung', 'Collezione'],
    'Tus colecciones': ['Your collections', 'Suas coleções', 'Vos collections', 'Deine Sammlungen', 'Le tue collezioni'],
    'Creá listas y organizá tu música, al estilo SimpMusic.': ['Create playlists and organize your music.', 'Crie playlists e organize suas músicas.', 'Créez des playlists et organisez votre musique.', 'Erstelle Playlists und organisiere deine Musik.', 'Crea playlist e organizza la tua musica.'],
    'Nueva playlist': ['New playlist', 'Nova playlist', 'Nouvelle playlist', 'Neue Playlist', 'Nuova playlist'],
    'No creaste ninguna playlist todavía.': ['You have not created a playlist yet.', 'Você ainda não criou uma playlist.', "Vous n'avez pas encore créé de playlist.", 'Du hast noch keine Playlist erstellt.', 'Non hai ancora creato una playlist.'],
    'Playlist personal': ['Personal playlist', 'Playlist pessoal', 'Playlist personnelle', 'Eigene Playlist', 'Playlist personale'],
    'Tu selección de música': ['Your music selection', 'Sua seleção de músicas', 'Votre sélection musicale', 'Deine Musikauswahl', 'La tua selezione musicale'],
    'Cargando…': ['Loading…', 'Carregando…', 'Chargement…', 'Wird geladen…', 'Caricamento…'],
    'Personalizar': ['Customize', 'Personalizar', 'Personnaliser', 'Anpassen', 'Personalizza'],
    'Diseñá tu experiencia de música.': ['Make music yours.', 'Personalize sua experiência musical.', 'Personnalisez votre expérience musicale.', 'Gestalte dein Musikerlebnis.', 'Personalizza la tua esperienza musicale.'],
    'Interfaz': ['Interface', 'Interface', 'Interface', 'Oberfläche', 'Interfaccia'],
    'Alterná sin interrumpir la música.': ['Switch without interrupting the music.', 'Alterne sem interromper a música.', 'Changez sans interrompre la musique.', 'Wechsle, ohne die Musik zu unterbrechen.', 'Cambia senza interrompere la musica.'],
    'Apariencia': ['Appearance', 'Aparência', 'Apparence', 'Darstellung', 'Aspetto'],
    'Idioma': ['Language', 'Idioma', 'Langue', 'Sprache', 'Lingua'],
    'El idioma se guarda en este navegador o en la app.': ['Language is saved on this browser or in the app.', 'O idioma é salvo neste navegador ou no app.', "La langue est enregistrée dans ce navigateur ou l'application.", 'Die Sprache wird in diesem Browser oder in der App gespeichert.', "La lingua viene salvata in questo browser o nell'app."],
    'Calidad de transmisión al navegador': ['Browser playback quality', 'Qualidade de reprodução no navegador', 'Qualité de lecture dans le navigateur', 'Wiedergabequalität im Browser', 'Qualità di riproduzione nel browser'],
    'Formato y calidad': ['Format and quality', 'Formato e qualidade', 'Format et qualité', 'Format und Qualität', 'Formato e qualità'],
    'Biblioteca y dispositivos': ['Library and devices', 'Biblioteca e dispositivos', 'Bibliothèque et appareils', 'Bibliothek und Geräte', 'Libreria e dispositivi'],
    'Escanear biblioteca': ['Scan library', 'Examinar biblioteca', 'Analyser la bibliothèque', 'Bibliothek scannen', 'Scansiona libreria'],
    'Ver parlantes': ['View speakers', 'Ver alto-falantes', 'Voir les enceintes', 'Lautsprecher anzeigen', 'Mostra altoparlanti'],
    'País de las radios': ['Radio country', 'País das rádios', 'Pays des radios', 'Radio-Land', 'Paese delle radio'],
    'Otras funciones': ['Other features', 'Outras funções', 'Autres fonctions', 'Weitere Funktionen', 'Altre funzioni'],
    'Todavía no hay música en la cola.': ['No music in the queue yet.', 'Ainda não há músicas na fila.', "Il n'y a pas encore de musique dans la file d'attente.", 'Noch keine Musik in der Warteschlange.', 'Non ci sono ancora brani in coda.'],
    'Buscando letras…': ['Searching for lyrics…', 'Buscando letras…', 'Recherche des paroles…', 'Liedtext wird gesucht…', 'Ricerca testi…'],
    'Otra versión': ['Another version', 'Outra versão', 'Autre version', 'Andere Version', 'Altra versione'],
    'Este navegador': ['This browser', 'Este navegador', 'Ce navigateur', 'Dieser Browser', 'Questo browser'],
    'Calidad seleccionada en Ajustes': ['Quality selected in Settings', 'Qualidade selecionada em Configurações', 'Qualité choisie dans les paramètres', 'Qualität in Einstellungen gewählt', 'Qualità selezionata nelle impostazioni'],
    'Requiere emparejar': ['Pairing required', 'Requer pareamento', 'Appairage requis', 'Kopplung erforderlich', 'Abbinamento richiesto'],
    'No se detectaron parlantes. Revisá mDNS, la misma LAN y OwnTone.': ['No speakers found. Check mDNS, the same LAN, and OwnTone.', 'Nenhum alto-falante detectado. Verifique mDNS, a mesma LAN e OwnTone.', 'Aucune enceinte détectée. Vérifiez mDNS, le même réseau local et OwnTone.', 'Keine Lautsprecher erkannt. Prüfe mDNS, dasselbe LAN und OwnTone.', 'Nessun altoparlante rilevato. Controlla mDNS, la stessa LAN e OwnTone.'],
    'Elegir letras sincronizadas': ['Choose synchronized lyrics', 'Escolher letras sincronizadas', 'Choisir des paroles synchronisées', 'Synchronisierten Liedtext wählen', 'Scegli testi sincronizzati'],
    'Artista y canción': ['Artist and song', 'Artista e música', 'Artiste et titre', 'Künstler und Song', 'Artista e brano'],
    'Sincronizada': ['Synchronized', 'Sincronizada', 'Synchronisées', 'Synchronisiert', 'Sincronizzato'],
    'Texto': ['Text', 'Texto', 'Texte', 'Text', 'Testo'],
    'Elegir': ['Choose', 'Escolher', 'Choisir', 'Auswählen', 'Scegli'],
    'Agregar a una playlist': ['Add to a playlist', 'Adicionar a uma playlist', 'Ajouter à une playlist', 'Zu einer Playlist hinzufügen', 'Aggiungi a una playlist'],
    'Primero creá una playlist desde el menú.': ['Create a playlist from the menu first.', 'Primeiro crie uma playlist no menu.', "Créez d'abord une playlist depuis le menu.", 'Erstelle zuerst eine Playlist im Menü.', 'Crea prima una playlist dal menu.'],
    'Nombre de la playlist': ['Playlist name', 'Nome da playlist', 'Nom de la playlist', 'Playlist-Name', 'Nome della playlist'],
    'Crear playlist': ['Create playlist', 'Criar playlist', 'Créer une playlist', 'Playlist erstellen', 'Crea playlist'],
    'Temporizador de apagado': ['Sleep timer', 'Temporizador de desligamento', "Minuteur d'arrêt", 'Sleep-Timer', 'Timer di spegnimento'],
    'Pausar la reproducción después de:': ['Pause playback after:', 'Pausar a reprodução após:', 'Mettre en pause après :', 'Wiedergabe pausieren nach:', 'Metti in pausa dopo:'],
    'Cancelar': ['Cancel', 'Cancelar', 'Annuler', 'Abbrechen', 'Annulla'],
    'Ecualizador del navegador': ['Browser equalizer', 'Equalizador do navegador', 'Égaliseur du navigateur', 'Browser-Equalizer', 'Equalizzatore del browser'],
    'Graves': ['Bass', 'Graves', 'Graves', 'Bass', 'Bassi'],
    'Medios': ['Mids', 'Médios', 'Médiums', 'Mitten', 'Medi'],
    'Agudos': ['Treble', 'Agudos', 'Aigus', 'Höhen', 'Alti'],
    'Restablecer ecualizador': ['Reset equalizer', 'Redefinir equalizador', "Réinitialiser l'égaliseur", 'Equalizer zurücksetzen', 'Reimposta equalizzatore'],
    'EN VIVO': ['LIVE', 'AO VIVO', 'EN DIRECT', 'LIVE', 'IN DIRETTA'],
    'Radio en vivo': ['Live radio', 'Rádio ao vivo', 'Radio en direct', 'Live-Radio', 'Radio in diretta']
  };
  Object.assign(messages, {
    'Liquid Glass · Inspiración Apple Music': ['Liquid Glass · Apple Music inspired', 'Liquid Glass · inspirado no Apple Music', "Liquid Glass · inspiré d'Apple Music", 'Liquid Glass · inspiriert von Apple Music', 'Liquid Glass · ispirato ad Apple Music'],
    'Material 3 · Inspiración Google': ['Material 3 · Google inspired', 'Material 3 · inspirado no Google', 'Material 3 · inspiré de Google', 'Material 3 · inspiriert von Google', 'Material 3 · ispirato a Google'],
    'Original · Sin conversión': ['Original · No conversion', 'Original · Sem conversão', 'Original · Sans conversion', 'Original · Ohne Umwandlung', 'Originale · Senza conversione'],
    'Tipo Spotify Baja · Opus 24 kbps': ['Spotify-like Low · Opus 24 kbps', 'Tipo Spotify Baixa · Opus 24 kbps', 'Type Spotify Basse · Opus 24 kbps', 'Spotify-ähnlich Niedrig · Opus 24 kbps', 'Simile a Spotify Bassa · Opus 24 kbps'],
    'Tipo Spotify Normal · Vorbis 96 kbps': ['Spotify-like Normal · Vorbis 96 kbps', 'Tipo Spotify Normal · Vorbis 96 kbps', 'Type Spotify Normale · Vorbis 96 kbps', 'Spotify-ähnlich Normal · Vorbis 96 kbps', 'Simile a Spotify Normale · Vorbis 96 kbps'],
    'Tipo Spotify Alta · Vorbis 160 kbps': ['Spotify-like High · Vorbis 160 kbps', 'Tipo Spotify Alta · Vorbis 160 kbps', 'Type Spotify Haute · Vorbis 160 kbps', 'Spotify-ähnlich Hoch · Vorbis 160 kbps', 'Simile a Spotify Alta · Vorbis 160 kbps'],
    'Tipo Spotify Muy alta · Vorbis 320 kbps': ['Spotify-like Very high · Vorbis 320 kbps', 'Tipo Spotify Muito alta · Vorbis 320 kbps', 'Type Spotify Très haute · Vorbis 320 kbps', 'Spotify-ähnlich Sehr hoch · Vorbis 320 kbps', 'Simile a Spotify Molto alta · Vorbis 320 kbps'],
    'FLAC · Sin pérdida (desde original)': ['FLAC · Lossless (from original)', 'FLAC · Sem perdas (do original)', "FLAC · Sans perte (depuis l'original)", 'FLAC · Verlustfrei (vom Original)', "FLAC · Senza perdita (dall'originale)"],
    'FFmpeg convierte durante la reproducción sin modificar los originales. En AirPlay y Chromecast, OwnTone negocia el formato compatible.': ['FFmpeg converts during playback without changing the originals. For AirPlay and Chromecast, OwnTone negotiates a compatible format.', 'O FFmpeg converte durante a reprodução sem alterar os originais. No AirPlay e Chromecast, o OwnTone negocia um formato compatível.', "FFmpeg convertit pendant la lecture sans modifier les originaux. Pour AirPlay et Chromecast, OwnTone négocie un format compatible.", 'FFmpeg konvertiert während der Wiedergabe, ohne Originale zu verändern. Für AirPlay und Chromecast handelt OwnTone ein kompatibles Format aus.', 'FFmpeg converte durante la riproduzione senza modificare gli originali. Per AirPlay e Chromecast, OwnTone negozia un formato compatibile.'],
    'M4A/AAC y Ogg no funcionan en todos los navegadores. En iPhone probá AAC o MP3 si no reproduce. El modo original requiere que el navegador admita ese archivo.': ['M4A/AAC and Ogg do not work in every browser. On iPhone, try AAC or MP3 if playback fails. Original mode requires browser support for the file.', 'M4A/AAC e Ogg não funcionam em todos os navegadores. No iPhone, tente AAC ou MP3. O modo original exige suporte do navegador ao arquivo.', 'M4A/AAC et Ogg ne fonctionnent pas dans tous les navigateurs. Sur iPhone, essayez AAC ou MP3. Le mode original nécessite la prise en charge du fichier.', 'M4A/AAC und Ogg funktionieren nicht in allen Browsern. Auf dem iPhone versuche AAC oder MP3. Der Originalmodus erfordert Browser-Unterstützung für die Datei.', 'M4A/AAC e Ogg non funzionano in tutti i browser. Su iPhone prova AAC o MP3. La modalità originale richiede il supporto del file.'],
    'La música permanece en la carpeta configurada. Los controles de AirPlay/Chromecast requieren que el receptor esté accesible desde la Raspberry.': ['Music stays in the configured folder. AirPlay/Chromecast controls require the receiver to be reachable from the Raspberry Pi.', 'A música permanece na pasta configurada. Os controles AirPlay/Chromecast exigem que o receptor esteja acessível pela Raspberry Pi.', 'La musique reste dans le dossier configuré. Les commandes AirPlay/Chromecast nécessitent que le récepteur soit accessible depuis le Raspberry Pi.', 'Musik bleibt im konfigurierten Ordner. AirPlay/Chromecast-Steuerung erfordert, dass der Empfänger vom Raspberry Pi aus erreichbar ist.', 'La musica resta nella cartella configurata. I controlli AirPlay/Chromecast richiedono che il ricevitore sia raggiungibile dal Raspberry Pi.'],
    'Elegí el país predeterminado para explorar emisoras. También podés cambiarlo desde la sección Radios.': ['Choose the default country for browsing stations. You can also change it in Online radio.', 'Escolha o país padrão para explorar estações. Também é possível alterá-lo em Rádios online.', 'Choisissez le pays par défaut pour explorer les stations. Vous pouvez aussi le changer dans Radios en ligne.', 'Wähle das Standardland für Sender. Du kannst es auch unter Online-Radio ändern.', 'Scegli il paese predefinito per esplorare le stazioni. Puoi cambiarlo anche in Radio online.'],
    'Favoritos, playlists, letras .lrc y búsqueda automática en LRCLIB, ecualizador web, temporizador, cola, aleatorio y repetir. Descubrimiento musical, podcasts, YouTube Music y Android Auto requieren desarrollos adicionales.': ['Favorites, playlists, .lrc lyrics and automatic LRCLIB search, web equalizer, sleep timer, queue, shuffle and repeat. Music discovery, podcasts, YouTube Music and Android Auto need further development.', 'Favoritos, playlists, letras .lrc e busca automática no LRCLIB, equalizador web, temporizador, fila, aleatório e repetição. Descoberta musical, podcasts, YouTube Music e Android Auto exigem desenvolvimento adicional.', 'Favoris, playlists, paroles .lrc et recherche automatique sur LRCLIB, égaliseur web, minuteur, file, lecture aléatoire et répétition. La découverte musicale, les podcasts, YouTube Music et Android Auto demandent encore du développement.', 'Favoriten, Playlists, .lrc-Liedtexte und automatische LRCLIB-Suche, Web-Equalizer, Sleep-Timer, Warteschlange, Zufallswiedergabe und Wiederholung. Musikentdeckung, Podcasts, YouTube Music und Android Auto erfordern weitere Entwicklung.', 'Preferiti, playlist, testi .lrc e ricerca automatica su LRCLIB, equalizzatore web, timer, coda, riproduzione casuale e ripetizione. Scoperta musicale, podcast, YouTube Music e Android Auto richiedono ulteriore sviluppo.'],
    'No se encontró la radio': ['Station not found', 'Rádio não encontrada', 'Station introuvable', 'Sender nicht gefunden', 'Stazione non trovata'],
    'No se encontró esa canción': ['Song not found', 'Música não encontrada', 'Titre introuvable', 'Song nicht gefunden', 'Brano non trovato'],
    'Tu biblioteca está vacía': ['Your library is empty', 'Sua biblioteca está vazia', 'Votre bibliothèque est vide', 'Deine Bibliothek ist leer', 'La tua libreria è vuota'],
    'Biblioteca actualizada': ['Library updated', 'Biblioteca atualizada', 'Bibliothèque actualisée', 'Bibliothek aktualisiert', 'Libreria aggiornata'],
    'Escaneando… puede tardar': ['Scanning… this may take a while', 'Examinando… pode demorar', 'Analyse en cours… cela peut prendre du temps', 'Scanne… das kann dauern', 'Scansione… potrebbe richiedere tempo'],
    'Agregada a la cola': ['Added to queue', 'Adicionada à fila', "Ajoutée à la file d'attente", 'Zur Warteschlange hinzugefügt', 'Aggiunto alla coda'],
    'Agregada a playlist': ['Added to playlist', 'Adicionada à playlist', 'Ajoutée à la playlist', 'Zur Playlist hinzugefügt', 'Aggiunto alla playlist'],
    'Playlist creada': ['Playlist created', 'Playlist criada', 'Playlist créée', 'Playlist erstellt', 'Playlist creata'],
    'Letra actualizada': ['Lyrics updated', 'Letra atualizada', 'Paroles actualisées', 'Liedtext aktualisiert', 'Testo aggiornato'],
    'Temporizador finalizado': ['Sleep timer finished', 'Temporizador finalizado', 'Minuteur terminé', 'Sleep-Timer abgelaufen', 'Timer terminato'],
    'Temporizador cancelado': ['Sleep timer canceled', 'Temporizador cancelado', 'Minuteur annulé', 'Sleep-Timer abgebrochen', 'Timer annullato'],
    'País de radios actualizado': ['Radio country updated', 'País das rádios atualizado', 'Pays des radios actualisé', 'Radio-Land aktualisiert', 'Paese delle radio aggiornato'],
    'Perfil actualizado para reproducción web': ['Web playback profile updated', 'Perfil de reprodução web atualizado', 'Profil de lecture web actualisé', 'Web-Wiedergabeprofil aktualisiert', 'Profilo di riproduzione web aggiornato'],
    'Esta radio no está disponible o no es compatible. Probá otra.': ['This station is unavailable or incompatible. Try another.', 'Esta rádio está indisponível ou é incompatível. Tente outra.', 'Cette station est indisponible ou incompatible. Essayez-en une autre.', 'Dieser Sender ist nicht verfügbar oder inkompatibel. Versuche einen anderen.', 'Questa stazione non è disponibile o compatibile. Provane un’altra.'],
    'Este formato no se pudo reproducir. Probá MP3 o AAC desde Ajustes.': ['This format could not be played. Try MP3 or AAC in Settings.', 'Não foi possível reproduzir este formato. Tente MP3 ou AAC nas Configurações.', 'Ce format ne peut pas être lu. Essayez MP3 ou AAC dans les paramètres.', 'Dieses Format konnte nicht abgespielt werden. Versuche MP3 oder AAC in den Einstellungen.', 'Impossibile riprodurre questo formato. Prova MP3 o AAC nelle impostazioni.'],
    'No se pudo abrir la biblioteca': ['Could not open the library', 'Não foi possível abrir a biblioteca', "Impossible d'ouvrir la bibliothèque", 'Bibliothek konnte nicht geöffnet werden', 'Impossibile aprire la libreria'],
    'No se encontraron letras. Podés buscar otra versión o agregar un archivo .lrc local.': ['No lyrics found. Try another version or add a local .lrc file.', 'Nenhuma letra encontrada. Tente outra versão ou adicione um arquivo .lrc local.', 'Aucune parole trouvée. Essayez une autre version ou ajoutez un fichier .lrc local.', 'Kein Liedtext gefunden. Versuche eine andere Version oder füge eine lokale .lrc-Datei hinzu.', 'Nessun testo trovato. Prova un’altra versione o aggiungi un file .lrc locale.'],
    'No se encontraron coincidencias. Probá otra búsqueda.': ['No matches found. Try another search.', 'Nenhuma correspondência encontrada. Tente outra busca.', 'Aucun résultat. Essayez une autre recherche.', 'Keine Treffer. Versuche eine andere Suche.', 'Nessuna corrispondenza. Prova un’altra ricerca.'],
    'Si la letra no coincide, buscá por artista y canción. Se consultará LRCLIB.': ['If the lyrics do not match, search by artist and song. LRCLIB will be queried.', 'Se a letra não corresponder, busque por artista e música. O LRCLIB será consultado.', 'Si les paroles ne correspondent pas, recherchez par artiste et titre. LRCLIB sera consulté.', 'Falls der Liedtext nicht passt, suche nach Künstler und Song. LRCLIB wird abgefragt.', 'Se il testo non corrisponde, cerca per artista e brano. Verrà consultato LRCLIB.'],
    'Afecta a la reproducción web, no a AirPlay/Chromecast.': ['Affects web playback, not AirPlay/Chromecast.', 'Afeta a reprodução web, não AirPlay/Chromecast.', 'Agit sur la lecture web, pas sur AirPlay/Chromecast.', 'Beeinflusst die Web-Wiedergabe, nicht AirPlay/Chromecast.', 'Influisce sulla riproduzione web, non su AirPlay/Chromecast.'],
    '¿Eliminar esta playlist?': ['Delete this playlist?', 'Excluir esta playlist?', 'Supprimer cette playlist ?', 'Diese Playlist löschen?', 'Eliminare questa playlist?']
  });
  const localeIndex = { en: 0, pt: 1, fr: 2, de: 3, it: 4 };
  const supported = new Set(languages.map(([code]) => code));
  const requested = new URLSearchParams(location.search).get('lang');
  let language = supported.has(requested) ? requested : localStorage.getItem('aurora_language');
  if (!supported.has(language)) language = supported.has(navigator.language.slice(0, 2)) ? navigator.language.slice(0, 2) : 'es';
  localStorage.setItem('aurora_language', language);
  if (requested) {
    const cleanUrl = new URL(location.href);
    cleanUrl.searchParams.delete('lang');
    history.replaceState(null, '', cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
  }
  const textSources = new WeakMap();
  const attributeSources = new WeakMap();

  function translate(source) {
    if (language === 'es') return source;
    const match = /^(\s*)(.*?)(\s*)$/s.exec(source);
    if (!match) return source;
    const entry = messages[match[2]];
    if (entry) return match[1] + entry[localeIndex[language]] + match[3];
    const count = /^(\d+) (canciones|álbumes|emisoras)$/.exec(match[2]);
    if (count) {
      const units = {
        canciones: ['songs', 'músicas', 'titres', 'Songs', 'brani'],
        'álbumes': ['albums', 'álbuns', 'albums', 'Alben', 'album'],
        emisoras: ['stations', 'estações', 'stations', 'Sender', 'stazioni']
      };
      return match[1] + count[1] + ' ' + units[count[2]][localeIndex[language]] + match[3];
    }
    return source;
  }

  function translateText(node) {
    const current = node.nodeValue;
    const saved = textSources.get(node);
    const source = saved && saved.rendered === current ? saved.source : current;
    const rendered = translate(source);
    textSources.set(node, { source, rendered });
    if (current !== rendered) node.nodeValue = rendered;
  }
  function translateAttributes(element) {
    const keys = ['title', 'placeholder', 'aria-label'];
    const saved = attributeSources.get(element) || {};
    for (const key of keys) {
      if (!element.hasAttribute(key)) continue;
      const current = element.getAttribute(key);
      const previous = saved[key];
      const source = previous && previous.rendered === current ? previous.source : current;
      const rendered = translate(source);
      saved[key] = { source, rendered };
      if (current !== rendered) element.setAttribute(key, rendered);
    }
    attributeSources.set(element, saved);
  }
  function translateTree(root) {
    if (root.nodeType === Node.TEXT_NODE) { translateText(root); return; }
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    if (root.matches('script,style,noscript')) return;
    translateAttributes(root);
    for (const child of root.childNodes) translateTree(child);
  }
  function setLanguage(code) {
    if (!supported.has(code)) return;
    language = code;
    localStorage.setItem('aurora_language', code);
    document.documentElement.lang = code;
    translateTree(document.body);
    if (window.AuroraAndroid?.setLanguage) window.AuroraAndroid.setLanguage(code);
  }
  document.documentElement.lang = language;
  translateTree(document.body);
  new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'characterData') translateText(record.target);
      else if (record.type === 'attributes') translateAttributes(record.target);
      else for (const added of record.addedNodes) translateTree(added);
    }
  }).observe(document.body, { childList: true, characterData: true, attributes: true, attributeFilter: ['title', 'placeholder', 'aria-label'], subtree: true });
  window.AuroraI18n = { languages, getLanguage: () => language, setLanguage, translate };
})();

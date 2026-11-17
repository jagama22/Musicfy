# Musicfy

Cliente de música para iPhone con la experiencia de Spotify, conectado a tu servidor **Navidrome** (API Subsonic).
Hecho con Expo SDK 58 + React Native + TypeScript. Se instala sin App Store, con Sideloadly y un Apple ID gratuito.

## Qué incluye

- **Inicio**: saludo, accesos rápidos, mixes por género, recientes, más escuchados, artistas, novedades y «Descubre».
- **Buscar**: géneros por colores, búsqueda en vivo con filtros (canciones, artistas, álbumes, playlists) e historial.
- **Tu biblioteca**: Canciones que te gustan, playlists, álbumes y artistas guardados. Se puede ordenar y ver en lista o cuadrícula. Desde aquí se crean playlists.
- **Detalles**: álbum, artista (populares, discografía, similares, biografía), playlist (renombrar, borrar, quitar canciones), géneros y mixes.
- **Reproductor**
  - Mini-player: desliza para cambiar de canción.
  - Pantalla completa: desliza hacia abajo para cerrar.
  - Aleatorio, repetir (todo / una), barra de progreso y cola con «Siguiente en la cola».
  - Radio de canción y reproducción automática de canciones parecidas al acabar.
- **Sistema**
  - Segundo plano, pantalla de bloqueo y Centro de Control (con siguiente/anterior).
  - Scrobbling a Navidrome y cola sincronizada con el servidor (al abrir la app retomas donde lo dejaste).
- **Ajustes**: calidad de streaming (transcodificación a MP3), borrar caché y cerrar sesión.

## 1. Preparación (una sola vez)

1. **Cuenta de GitHub**: créala en https://github.com/signup.
2. **Repositorio**: crea uno nuevo llamado `musicfy`. Recomendado **público**: los minutos de compilación en Mac son ilimitados y el código no contiene contraseñas. Después, desde esta carpeta:
   ```bash
   git init
   git add .
   git commit -m "Musicfy v1"
   git branch -M main
   git remote add origin https://github.com/<TU_USUARIO>/musicfy.git
   git push -u origin main
   ```
3. **En Windows**, instala:
   - **iTunes** e **iCloud**, en las versiones descargables de apple.com, *no* las de Microsoft Store. Sideloadly las necesita para hablar con el iPhone.
   - **Sideloadly**: https://sideloadly.io
4. **En el iPhone**: Ajustes › Privacidad y seguridad › **Modo desarrollador** › activar. El iPhone se reinicia.

## 2. Compilar el .ipa (en la nube)

1. En GitHub, abre tu repo › pestaña **Actions** › **iOS build** › **Run workflow**.
2. Elige `Release` (app autónoma) y pulsa **Run workflow**. Tarda unos 20–30 min.
3. Al terminar, descarga el artifact **Musicfy-Release-ipa**. Es un `.zip`; dentro está `Musicfy-Release.ipa`.

## 3. Instalar en el iPhone

1. Conecta el iPhone al PC por USB y desbloquéalo. Si lo pregunta, pulsa «Confiar en este ordenador».
2. Abre Sideloadly y arrastra `Musicfy-Release.ipa`.
3. Escribe tu Apple ID y pulsa **Start**. Te pedirá la contraseña y, si la tienes activa, el código de verificación en dos pasos.
4. En el iPhone: Ajustes › General › **VPN y gestión de dispositivos** › tu Apple ID › **Confiar**.
5. Abre Musicfy y conéctate:
   - **Servidor**: `http://<IP-de-tu-VM>:4533` (la misma URL que usas en Amperfy).
   - **Usuario y contraseña**: los de Navidrome.

### Renovar cada 7 días

Con Apple ID gratuito la firma caduca a los 7 días: la app deja de abrirse, pero no pierdes nada. Para renovarla:

- Vuelve a pulsar **Start** en Sideloadly con el mismo `.ipa`.
- O activa en Sideloadly la opción de **auto-refresh**: renueva sola por wifi mientras el PC esté encendido y en la misma red.

Límite: 3 apps instaladas así a la vez por Apple ID.

## Desarrollo

```bash
npm install
npm run web         # vista previa en el navegador (http://localhost:8081)
npx tsc --noEmit    # comprobar tipos
npx expo-doctor     # comprobar dependencias
```

- **Servidor de prueba**: `node dev/mock-subsonic.mjs` levanta un Subsonic falso en `http://localhost:4533`, con usuario `demo` y contraseña `demo`. Trae datos y tonos de ejemplo para probar sin tocar tu Navidrome.
- **Recarga en vivo en el iPhone**:
  1. Compila el workflow con `Debug` e instala ese `.ipa`.
  2. Arranca `npx expo start` en el PC.
  3. Con el iPhone en la misma wifi, abre la app e introduce la URL que muestra la consola.
- **Iconos**: `node dev/make-icon.mjs` regenera los iconos de `assets/`.

## Notas

- El servidor va por HTTP sin cifrar. La contraseña nunca se guarda ni se envía en claro (se usa token MD5 + salt de Subsonic), pero se recomienda poner HTTPS en la VM (por ejemplo, Caddy + un dominio gratuito de DuckDNS).
- Para biografías, artistas similares y «Populares» con datos reales, configura en Navidrome `ND_LASTFM_APIKEY` y `ND_LASTFM_SECRET`.
- Lo que depende de los servidores de Spotify (su algoritmo, Spotify Connect, social) se aproxima con tus datos de Navidrome.

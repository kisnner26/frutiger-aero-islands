import { routeHref } from '../../app/useHashRoute';
import { CONTACT_EMAIL } from '../../legal/contact';
import { AeroWindow } from '../../ui/AeroWindow';
import { tr, lang } from '../../i18n';
import './legal.css';

/** reglas, privacidad y términos de la beta en lenguaje sencillo. */
export function RulesPage() {
  return (
    <AeroWindow className="win-rules" title={tr('reglas y privacidad', 'rules and privacy')} icon={<span className="mini-orb mini-orb--green" />}>
      <article className="rules">
        {lang === 'en' ? (
          <>
        <h1 id="titulo-vista" tabIndex={-1} data-vista-titulo>rules and privacy</h1>
        <p className="rules__beta"><strong>this is a beta.</strong> the game is being tested: it may break, change or reset data. thank you for helping us improve it.</p>

        <h2>what we store</h2>
        <ul>
          <li>your email and your password (the password is stored encrypted by the accounts service; we cannot see it).</li>
          <li>your username, the country you chose and your character.</li>
          <li>your island: the decorations, the level and your sparkles.</li>
          <li>your actions on the map (restore, claim, capture) and likes, for the ranking and the challenges.</li>
          <li>in your browser we store your session, your island draft, your album photos and your settings. album photos never leave your device.</li>
        </ul>
        <p>your username, country, character, island and points are <strong>public</strong>: other people can see them when they visit you and in the ranking. your email is not shown to anyone.</p>

        <h2>what we do not do</h2>
        <ul>
          <li>we do not sell your data or show ads.</li>
          <li>we do not ask for your real name, your phone number or your exact location.</li>
        </ul>
        <p>we use third-party services: supabase (accounts and data) and github pages (hosting for the site). they may log technical data such as your ip address, under their own policies.</p>

        <h2>your rights</h2>
        <p>you can delete your account and all your data at any time from <a href={routeHref('auth')}>my account</a> with the "delete my account" button. you can also change your country or your character whenever you want.</p>

        <h2>house rules</h2>
        <ul>
          <li>be kind: no harassment, insults, hate or adult content.</li>
          <li>usernames cannot be offensive, or impersonate other people or the game team.</li>
          <li>do not cheat or use several accounts to inflate the ranking or the likes.</li>
          <li>your island is your space, but it must be suitable for all audiences.</li>
        </ul>
        <p>if someone breaks the rules, we may hide or delete their island or account, or remove their points from the ranking.</p>

        <h2>how to report</h2>
        <p>go to the person's island and press the "report" button (bottom left). choose a reason and, if you like, write a note. we review reports by hand.</p>

        <h2>contact</h2>
        <p>{CONTACT_EMAIL ? <>write to us at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</> : 'for now, use the "report" button to tell us about any problem.'}</p>

        <p className="rules__foot"><a href={routeHref('inicio')}>back to the game</a></p>
          </>
        ) : (
          <>
        <h1 id="titulo-vista" tabIndex={-1} data-vista-titulo>reglas y privacidad</h1>
        <p className="rules__beta"><strong>esto es una beta.</strong> el juego está en pruebas: puede fallar, cambiar o reiniciar datos. gracias por ayudarnos a mejorarlo.</p>

        <h2>qué guardamos</h2>
        <ul>
          <li>tu correo y tu contraseña (la contraseña se guarda cifrada por el servicio de cuentas; nosotros no la vemos).</li>
          <li>tu nombre de usuario, el país que elegiste y tu personaje.</li>
          <li>tu isla: las decoraciones, el nivel y tus brillos.</li>
          <li>tus acciones en el mapa (restaurar, reclamar, capturar) y los me gusta, para el ranking y los retos.</li>
          <li>en tu navegador guardamos tu sesión, tu borrador de isla, tus fotos del álbum y tus ajustes. las fotos del álbum no salen de tu dispositivo.</li>
        </ul>
        <p>tu nombre de usuario, país, personaje, isla y puntos son <strong>públicos</strong>: otras personas pueden verlos al visitarte y en el ranking. tu correo no se muestra a nadie.</p>

        <h2>qué no hacemos</h2>
        <ul>
          <li>no vendemos tus datos ni mostramos anuncios.</li>
          <li>no pedimos tu nombre real, tu teléfono ni tu ubicación exacta.</li>
        </ul>
        <p>usamos servicios de terceros: supabase (cuentas y datos) y github pages (alojamiento de la página). ellos pueden registrar datos técnicos como la dirección ip, según sus propias políticas.</p>

        <h2>tus derechos</h2>
        <p>puedes borrar tu cuenta y todos tus datos en cualquier momento desde <a href={routeHref('auth')}>mi cuenta</a> con el botón "borrar mi cuenta". también puedes cambiar tu país o tu personaje cuando quieras.</p>

        <h2>reglas para convivir</h2>
        <ul>
          <li>sé amable: nada de acoso, insultos, odio ni contenido para adultos.</li>
          <li>los nombres de usuario no pueden ser ofensivos, ni hacerse pasar por otras personas o por el equipo del juego.</li>
          <li>no hagas trampa ni uses varias cuentas para inflar el ranking o los me gusta.</li>
          <li>tu isla es tu espacio, pero debe ser apta para todo público.</li>
        </ul>
        <p>si alguien incumple las reglas, podemos ocultar o borrar su isla o su cuenta, o quitar sus puntos del ranking.</p>

        <h2>cómo reportar</h2>
        <p>entra a la isla de la persona y pulsa el botón "reportar" (abajo a la izquierda). elige un motivo y, si quieres, escribe una nota. revisamos los reportes a mano.</p>

        <h2>contacto</h2>
        <p>{CONTACT_EMAIL ? <>escríbenos a <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</> : 'por ahora, usa el botón "reportar" para avisarnos de cualquier problema.'}</p>

        <p className="rules__foot"><a href={routeHref('inicio')}>volver al juego</a></p>
          </>
        )}
      </article>
    </AeroWindow>
  );
}

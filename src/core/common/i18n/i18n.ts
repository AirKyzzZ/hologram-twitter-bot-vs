/**
 * Default translations for the Twitter Bot Agent.
 */
export const DEFAULT_TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    ROOT_TITLE: 'Twitter Bot',
    LOGOUT: 'Logout',
    CREDENTIAL: 'Authenticate',
    WELCOME:
      'Welcome to the Hologram Twitter Manager!\nI help you compose, review, and publish tweets.\n\nTap "Compose Tweet" to get started, or send me a topic directly.',
    LOGIN_REQUIRED: 'Please log in to continue.',
    AUTH_REQUIRED: 'Authentication is required to access this feature.',
    AUTH_SUCCESS: 'Authentication completed successfully. You can now access all features.',
    AUTH_SUCCESS_NAME: 'Authentication successful. Welcome, {name}! You can now access all features.',
    WAITING_CREDENTIAL: 'Waiting for you to complete the credential process...',
    AUTH_PROCESS_STARTED: 'Authentication process has started. Please respond to the credential request.',
    STATS_ERROR: 'Sorry, we could not retrieve your statistics at the moment.',
    ERROR_MESSAGES: 'The service is not available at the moment. Please try again later.',
    COMPOSE_PROMPT: 'What would you like to tweet about? Send me a topic or idea.',
    DRAFT_HEADER: 'Here are 2 drafts for @{handle}:',
    DRAFT_LABEL: 'Draft {n} ({chars} chars):',
    DRAFT_REVIEW_PROMPT: 'Choose an option from the menu below.',
    EDIT_PROMPT: 'Send your edited version, or describe the changes you want.',
    CONFIRM_PROMPT: 'Ready to publish this tweet?\n\n"{draft}"\n\nTap Publish to post it, or Edit to make changes.',
    PUBLISH_SUCCESS: 'Published to @{handle}!\n\n{url}\n\n{content}',
    PUBLISH_FAILED: 'Failed to publish tweet: {error}',
    RATE_LIMIT: 'Daily tweet limit reached ({budget} tweets/day). Try again tomorrow.',
    REMAINING_BUDGET: 'Posts today: {remaining}/{budget} remaining',
    TWITTER_NOT_CONFIGURED: 'Twitter posting is not configured. Drafts will still be generated.',
    CANCEL_CONFIRM: 'Draft discarded. Send a new topic or tap "Compose Tweet" to start over.',
    NO_DRAFTS: 'No active drafts. Tap "Compose Tweet" to create one.',
    RECENT_HEADER: 'Recent tweets from @{handle}:',
    RECENT_NONE: 'No tweets published yet.',
    HELP_TEXT:
      'I help you manage Twitter posts for @{handle}.\n\n' +
      '- Tap "Compose Tweet" or send me a topic\n' +
      '- I\'ll generate 2 draft options\n' +
      '- Review, edit, or approve a draft\n' +
      '- Approved tweets are published to Twitter',
    COMPOSE_TWEET: 'Compose Tweet',
    RECENT_TWEETS: 'Recent Tweets',
    APPROVE_DRAFT_1: 'Approve Draft 1',
    APPROVE_DRAFT_2: 'Approve Draft 2',
    REGENERATE: 'Regenerate',
    EDIT_DRAFT: 'Edit',
    CANCEL: 'Cancel',
    PUBLISH: 'Publish',
    HELP: 'Help',
  },
  fr: {
    ROOT_TITLE: 'Twitter Bot',
    LOGOUT: 'Déconnexion',
    CREDENTIAL: 'Authentifier',
    WELCOME:
      'Bienvenue sur le gestionnaire Twitter Hologram !\nJe vous aide à rédiger, réviser et publier des tweets.\n\nAppuyez sur "Composer un Tweet" pour commencer, ou envoyez-moi un sujet.',
    AUTH_REQUIRED: "L'authentification est requise pour accéder à cette fonctionnalité.",
    AUTH_SUCCESS: 'Authentification réussie. Vous pouvez maintenant accéder à toutes les fonctionnalités.',
    AUTH_SUCCESS_NAME:
      'Authentification réussie. Bienvenue, {name} ! Vous pouvez maintenant accéder à toutes les fonctionnalités.',
    WAITING_CREDENTIAL: "En attente de la fin du processus d'authentification...",
    AUTH_PROCESS_STARTED: "Le processus d'authentification a commencé. Veuillez répondre à la demande de justificatif.",
    STATS_ERROR: "Désolé, nous n'avons pas pu récupérer vos statistiques pour le moment.",
    ERROR_MESSAGES: "Le service n'est pas disponible pour le moment. Veuillez réessayer plus tard.",
    COMPOSE_PROMPT: 'De quoi souhaitez-vous tweeter ? Envoyez-moi un sujet ou une idée.',
    DRAFT_HEADER: 'Voici 2 brouillons pour @{handle} :',
    DRAFT_LABEL: 'Brouillon {n} ({chars} car.) :',
    DRAFT_REVIEW_PROMPT: 'Choisissez une option dans le menu ci-dessous.',
    EDIT_PROMPT: 'Envoyez votre version modifiée, ou décrivez les changements souhaités.',
    CONFIRM_PROMPT: 'Prêt à publier ce tweet ?\n\n"{draft}"\n\nAppuyez sur Publier ou Modifier.',
    PUBLISH_SUCCESS: 'Publié sur @{handle} !\n\n{url}\n\n{content}',
    PUBLISH_FAILED: 'Échec de la publication : {error}',
    RATE_LIMIT: 'Limite quotidienne atteinte ({budget} tweets/jour). Réessayez demain.',
    REMAINING_BUDGET: "Publications aujourd'hui : {remaining}/{budget} restants",
    TWITTER_NOT_CONFIGURED: "La publication Twitter n'est pas configurée. Les brouillons seront quand même générés.",
    CANCEL_CONFIRM: 'Brouillon supprimé. Envoyez un nouveau sujet ou appuyez sur "Composer un Tweet".',
    NO_DRAFTS: 'Aucun brouillon actif. Appuyez sur "Composer un Tweet" pour en créer un.',
    RECENT_HEADER: 'Tweets récents de @{handle} :',
    RECENT_NONE: 'Aucun tweet publié pour le moment.',
    HELP_TEXT:
      'Je gère les publications Twitter pour @{handle}.\n\n' +
      '- Appuyez sur "Composer un Tweet" ou envoyez un sujet\n' +
      '- Je génère 2 options de brouillon\n' +
      '- Révisez, modifiez ou approuvez\n' +
      '- Les tweets approuvés sont publiés sur Twitter',
    COMPOSE_TWEET: 'Composer un Tweet',
    RECENT_TWEETS: 'Tweets récents',
    APPROVE_DRAFT_1: 'Approuver brouillon 1',
    APPROVE_DRAFT_2: 'Approuver brouillon 2',
    REGENERATE: 'Régénérer',
    EDIT_DRAFT: 'Modifier',
    CANCEL: 'Annuler',
    PUBLISH: 'Publier',
    HELP: 'Aide',
  },
  es: {
    ROOT_TITLE: 'Twitter Bot',
    LOGOUT: 'Cerrar sesión',
    CREDENTIAL: 'Autenticar',
    WELCOME:
      '¡Bienvenido al gestor de Twitter Hologram!\nTe ayudo a redactar, revisar y publicar tweets.\n\nToca "Componer Tweet" para empezar, o envíame un tema.',
    AUTH_REQUIRED: 'Se requiere autenticación para acceder a esta función.',
    AUTH_SUCCESS: 'Autenticación completada con éxito. Ahora puedes acceder a todas las funciones.',
    AUTH_SUCCESS_NAME:
      'Autenticación completada con éxito. ¡Bienvenido, {name}! Ahora puedes acceder a todas las funciones.',
    WAITING_CREDENTIAL: 'Esperando que completes el proceso de credencial...',
    AUTH_PROCESS_STARTED: 'El proceso de autenticación ha comenzado. Por favor, responde a la solicitud de credencial.',
    STATS_ERROR: 'Lo sentimos, no pudimos obtener tus estadísticas en este momento.',
    ERROR_MESSAGES: 'El servicio no está disponible en este momento. Por favor, intenta de nuevo más tarde.',
    COMPOSE_PROMPT: '¿Sobre qué te gustaría tweetear? Envíame un tema o idea.',
    DRAFT_HEADER: 'Aquí tienes 2 borradores para @{handle}:',
    DRAFT_LABEL: 'Borrador {n} ({chars} car.):',
    DRAFT_REVIEW_PROMPT: 'Elige una opción del menú.',
    EDIT_PROMPT: 'Envía tu versión editada o describe los cambios que deseas.',
    CONFIRM_PROMPT: '¿Listo para publicar?\n\n"{draft}"\n\nToca Publicar o Editar.',
    PUBLISH_SUCCESS: '¡Publicado en @{handle}!\n\n{url}\n\n{content}',
    PUBLISH_FAILED: 'Error al publicar: {error}',
    RATE_LIMIT: 'Límite diario alcanzado ({budget} tweets/día). Intenta mañana.',
    REMAINING_BUDGET: 'Publicaciones hoy: {remaining}/{budget} restantes',
    TWITTER_NOT_CONFIGURED: 'La publicación en Twitter no está configurada. Los borradores se generarán igualmente.',
    CANCEL_CONFIRM: 'Borrador descartado. Envía un nuevo tema o toca "Componer Tweet".',
    NO_DRAFTS: 'Sin borradores activos. Toca "Componer Tweet" para crear uno.',
    RECENT_HEADER: 'Tweets recientes de @{handle}:',
    RECENT_NONE: 'Aún no hay tweets publicados.',
    HELP_TEXT:
      'Gestiono publicaciones de Twitter para @{handle}.\n\n' +
      '- Toca "Componer Tweet" o envíame un tema\n' +
      '- Genero 2 opciones de borrador\n' +
      '- Revisa, edita o aprueba\n' +
      '- Los tweets aprobados se publican en Twitter',
    COMPOSE_TWEET: 'Componer Tweet',
    RECENT_TWEETS: 'Tweets recientes',
    APPROVE_DRAFT_1: 'Aprobar borrador 1',
    APPROVE_DRAFT_2: 'Aprobar borrador 2',
    REGENERATE: 'Regenerar',
    EDIT_DRAFT: 'Editar',
    CANCEL: 'Cancelar',
    PUBLISH: 'Publicar',
    HELP: 'Ayuda',
  },
}

export const TRANSLATIONS = DEFAULT_TRANSLATIONS

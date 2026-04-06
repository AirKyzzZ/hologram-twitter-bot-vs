export const DEFAULT_CHATBOT_WELCOME_TEMPLATES: Record<string, () => string> = {
  en: () =>
    `Welcome to the Hologram Twitter Manager!\nI help you compose, review, and publish tweets.\n\nTap "Compose Tweet" to get started, or send me a topic directly.`,

  es: () =>
    `¡Bienvenido al gestor de Twitter Hologram!\nTe ayudo a redactar, revisar y publicar tweets.\n\nToca "Componer Tweet" para empezar, o envíame un tema.`,

  fr: () =>
    `Bienvenue sur le gestionnaire Twitter Hologram !\nJe vous aide à rédiger, réviser et publier des tweets.\n\nAppuyez sur "Composer un Tweet" pour commencer, ou envoyez-moi un sujet.`,

  pt: () =>
    `Bem-vindo ao Hologram Twitter Manager!\nEu ajudo você a compor, revisar e publicar tweets.\n\nToque em "Compor Tweet" para começar, ou me envie um tópico.`,
}

export const CHATBOT_WELCOME_TEMPLATES = DEFAULT_CHATBOT_WELCOME_TEMPLATES

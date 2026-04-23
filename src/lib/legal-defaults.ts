/**
 * Default legal copy used on every photographer's public site when the
 * photographer has not provided their own custom Terms or Privacy text.
 *
 * The text describes the relationship between the photographer (the studio
 * running the site) and their client (the visitor / booker). It is intentionally
 * generic so it works for any photography studio.
 *
 * Photographers can override these texts via Website Editor → Settings → Legal.
 *
 * NOTE: This is plain HTML (rendered with `dangerouslySetInnerHTML` inside the
 * legal page). Keep it semantic and accessible.
 */

type Lang = "en" | "pt" | "es";

interface LegalTexts {
  termsTitle: string;
  privacyTitle: string;
  lastUpdatedLabel: string;
  studioFallback: string;
  termsHtml: (studio: string) => string;
  privacyHtml: (studio: string) => string;
}

const en: LegalTexts = {
  termsTitle: "Terms of Service",
  privacyTitle: "Privacy Policy",
  lastUpdatedLabel: "Last updated",
  studioFallback: "the studio",
  termsHtml: (studio) => `
    <p>These Terms of Service govern the relationship between <strong>${studio}</strong> ("we", "us", "the studio") and you ("client", "you") when you book a session, purchase a product, or otherwise use this website.</p>
    <h2>1. Booking &amp; Payments</h2>
    <p>Sessions are confirmed only after the agreed deposit or full payment is received. Prices, packages, and add-ons are those displayed at the moment of booking. Additional services requested after booking may be charged separately.</p>
    <h2>2. Rescheduling &amp; Cancellations</h2>
    <p>Rescheduling is allowed subject to availability when requested with reasonable notice. Cancellations may forfeit the deposit. Cancellations due to severe weather or events outside either party's control will be rescheduled at no extra cost.</p>
    <h2>3. Delivery of Photos</h2>
    <p>Final images are delivered through a private online gallery within the timeframe communicated for each session type. Galleries remain available for the period stated at the time of delivery; clients are responsible for downloading and backing up their files.</p>
    <h2>4. Image Rights &amp; Use</h2>
    <p>The studio retains the copyright of all images. Clients receive a personal, non-commercial license to print and share the delivered images. The studio may use selected images for portfolio, marketing and social media purposes unless the client requests otherwise in writing.</p>
    <h2>5. Client Responsibilities</h2>
    <p>The client agrees to provide accurate contact and billing information, to arrive on time for the session, and to obtain any permits or permissions required for the chosen location.</p>
    <h2>6. Limitation of Liability</h2>
    <p>The studio's liability is limited to the amount paid for the affected service. The studio is not liable for indirect or consequential damages, including loss of files caused by client devices or third-party services after delivery.</p>
    <h2>7. Changes to These Terms</h2>
    <p>We may update these Terms from time to time. The latest version will always be available on this page.</p>
    <h2>8. Contact</h2>
    <p>For any question about these Terms, please contact ${studio} through the contact information provided on this website.</p>
  `,
  privacyHtml: (studio) => `
    <p>This Privacy Policy explains how <strong>${studio}</strong> ("we", "us", "the studio") collects, uses, and protects your personal information when you visit this website, book a session, or interact with us.</p>
    <h2>1. Information We Collect</h2>
    <ul>
      <li><strong>Contact details</strong> you provide (name, email, phone) when you book a session, fill out a form or send a message.</li>
      <li><strong>Booking information</strong> such as session date, location, package and any briefing answers you submit.</li>
      <li><strong>Payment information</strong> processed by our secure payment provider — we do not store full card details on our servers.</li>
      <li><strong>Photographs</strong> taken during the session and delivered through our private galleries.</li>
      <li><strong>Technical data</strong> such as IP address, browser type and pages visited, collected through cookies and basic analytics.</li>
    </ul>
    <h2>2. How We Use Your Information</h2>
    <p>We use your information to provide our photography services, process bookings and payments, deliver your photos, send service-related communications, improve our website, and comply with our legal obligations.</p>
    <h2>3. Sharing Your Information</h2>
    <p>We do not sell your personal data. We share information only with trusted providers that help us run the studio (payment processor, gallery hosting, email delivery), and only to the extent necessary to deliver our services.</p>
    <h2>4. Use of Your Photographs</h2>
    <p>We may use selected images from your session in our portfolio, social media or marketing materials. If you do not wish your photos to be used publicly, please let us know in writing before or after the session.</p>
    <h2>5. Your Rights</h2>
    <p>You may request access to, correction of, or deletion of your personal data at any time by contacting us. You may also withdraw your consent for marketing communications.</p>
    <h2>6. Data Retention</h2>
    <p>We keep your personal data and images only for as long as necessary to provide our services and to comply with legal and accounting obligations.</p>
    <h2>7. Cookies</h2>
    <p>This site uses cookies for basic functionality and anonymous analytics. You can disable cookies in your browser settings.</p>
    <h2>8. Contact</h2>
    <p>For any privacy question or to exercise your rights, please contact ${studio} through the contact information provided on this website.</p>
  `,
};

const pt: LegalTexts = {
  termsTitle: "Termos de Serviço",
  privacyTitle: "Política de Privacidade",
  lastUpdatedLabel: "Última atualização",
  studioFallback: "o estúdio",
  termsHtml: (studio) => `
    <p>Estes Termos de Serviço regem a relação entre <strong>${studio}</strong> ("nós", "estúdio") e você ("cliente") ao agendar uma sessão, contratar um serviço ou utilizar este site.</p>
    <h2>1. Reservas e Pagamentos</h2>
    <p>As sessões são confirmadas somente após o recebimento do sinal ou pagamento integral acordado. Preços, pacotes e adicionais são os exibidos no momento da reserva. Serviços extras solicitados após a contratação poderão ser cobrados separadamente.</p>
    <h2>2. Remarcação e Cancelamento</h2>
    <p>Remarcações são permitidas conforme disponibilidade, mediante aviso prévio razoável. Cancelamentos podem implicar perda do sinal pago. Cancelamentos por motivos climáticos severos ou casos fortuitos serão remarcados sem custo adicional.</p>
    <h2>3. Entrega das Fotos</h2>
    <p>As imagens finais são entregues por meio de galeria online privada, dentro do prazo informado para cada tipo de sessão. A galeria permanece disponível pelo período comunicado na entrega; é responsabilidade do cliente realizar o download e o backup dos arquivos.</p>
    <h2>4. Direitos sobre as Imagens</h2>
    <p>O estúdio detém os direitos autorais de todas as imagens produzidas. O cliente recebe uma licença pessoal e não comercial para imprimir e compartilhar as imagens entregues. O estúdio poderá utilizar imagens selecionadas em portfólio, marketing e redes sociais, salvo manifestação contrária do cliente, por escrito.</p>
    <h2>5. Responsabilidades do Cliente</h2>
    <p>O cliente compromete-se a fornecer informações de contato e cobrança corretas, comparecer pontualmente à sessão e obter quaisquer autorizações necessárias para o local escolhido.</p>
    <h2>6. Limitação de Responsabilidade</h2>
    <p>A responsabilidade do estúdio limita-se ao valor pago pelo serviço afetado. O estúdio não responde por danos indiretos, incluindo perda de arquivos provocada por dispositivos do cliente ou por serviços de terceiros após a entrega.</p>
    <h2>7. Alterações destes Termos</h2>
    <p>Estes Termos podem ser atualizados periodicamente. A versão vigente estará sempre disponível nesta página.</p>
    <h2>8. Contato</h2>
    <p>Para dúvidas sobre estes Termos, entre em contato com ${studio} pelos canais informados neste site.</p>
  `,
  privacyHtml: (studio) => `
    <p>Esta Política de Privacidade descreve como <strong>${studio}</strong> ("nós", "estúdio") coleta, utiliza e protege seus dados pessoais quando você acessa este site, agenda uma sessão ou interage conosco.</p>
    <h2>1. Informações Coletadas</h2>
    <ul>
      <li><strong>Dados de contato</strong> fornecidos por você (nome, e-mail, telefone) ao agendar, preencher formulários ou enviar mensagens.</li>
      <li><strong>Dados da sessão</strong> como data, local, pacote escolhido e respostas de briefing.</li>
      <li><strong>Dados de pagamento</strong> processados por provedor de pagamento seguro — não armazenamos dados completos do cartão em nossos servidores.</li>
      <li><strong>Fotografias</strong> realizadas durante a sessão e entregues por galerias privadas.</li>
      <li><strong>Dados técnicos</strong> como IP, navegador e páginas visitadas, coletados via cookies e analytics básicos.</li>
    </ul>
    <h2>2. Uso das Informações</h2>
    <p>Utilizamos seus dados para prestar nossos serviços fotográficos, processar reservas e pagamentos, entregar suas fotos, enviar comunicações relacionadas ao serviço, melhorar este site e cumprir obrigações legais.</p>
    <h2>3. Compartilhamento</h2>
    <p>Não vendemos seus dados. Compartilhamos informações apenas com prestadores de confiança que viabilizam nossa operação (processador de pagamento, hospedagem de galerias, envio de e-mails) e estritamente no necessário.</p>
    <h2>4. Uso de suas Fotografias</h2>
    <p>Poderemos utilizar imagens selecionadas em nosso portfólio, redes sociais ou material promocional. Caso prefira que suas fotos não sejam utilizadas publicamente, comunique-nos por escrito antes ou após a sessão.</p>
    <h2>5. Seus Direitos</h2>
    <p>Você pode solicitar acesso, correção ou exclusão dos seus dados pessoais a qualquer momento, bem como revogar o consentimento para comunicações de marketing.</p>
    <h2>6. Retenção de Dados</h2>
    <p>Mantemos seus dados pessoais e imagens apenas pelo tempo necessário à prestação dos serviços e ao cumprimento de obrigações legais e contábeis.</p>
    <h2>7. Cookies</h2>
    <p>Este site utiliza cookies para funcionalidades básicas e analytics anônimos. Você pode desativar cookies nas configurações do navegador.</p>
    <h2>8. Contato</h2>
    <p>Para qualquer questão sobre privacidade ou para exercer seus direitos, entre em contato com ${studio} pelos canais informados neste site.</p>
  `,
};

const es: LegalTexts = {
  termsTitle: "Términos de Servicio",
  privacyTitle: "Política de Privacidad",
  lastUpdatedLabel: "Última actualización",
  studioFallback: "el estudio",
  termsHtml: (studio) => `
    <p>Estos Términos de Servicio rigen la relación entre <strong>${studio}</strong> ("nosotros", "el estudio") y usted ("cliente") al reservar una sesión, contratar un servicio o utilizar este sitio web.</p>
    <h2>1. Reservas y Pagos</h2>
    <p>Las sesiones se confirman únicamente tras el pago del depósito o del importe total acordado. Los precios, paquetes y extras son los mostrados en el momento de la reserva. Los servicios adicionales solicitados después de la contratación podrán cobrarse aparte.</p>
    <h2>2. Reprogramación y Cancelaciones</h2>
    <p>Se permite la reprogramación según disponibilidad, con un aviso razonable. Las cancelaciones pueden suponer la pérdida del depósito. Cancelaciones por causas climáticas graves o fuerza mayor se reprogramarán sin coste adicional.</p>
    <h2>3. Entrega de las Fotos</h2>
    <p>Las imágenes finales se entregan mediante una galería privada en línea, dentro del plazo indicado para cada tipo de sesión. La galería permanece disponible por el periodo informado en la entrega; el cliente es responsable de descargar y respaldar sus archivos.</p>
    <h2>4. Derechos sobre las Imágenes</h2>
    <p>El estudio conserva los derechos de autor de todas las imágenes. El cliente recibe una licencia personal y no comercial para imprimir y compartir las imágenes entregadas. El estudio podrá utilizar imágenes seleccionadas en portafolio, marketing y redes sociales, salvo solicitud contraria del cliente por escrito.</p>
    <h2>5. Responsabilidades del Cliente</h2>
    <p>El cliente se compromete a proporcionar datos de contacto y facturación correctos, llegar puntual a la sesión y obtener los permisos necesarios para el lugar elegido.</p>
    <h2>6. Limitación de Responsabilidad</h2>
    <p>La responsabilidad del estudio se limita al importe pagado por el servicio afectado. El estudio no responde por daños indirectos, incluida la pérdida de archivos provocada por dispositivos del cliente o servicios de terceros tras la entrega.</p>
    <h2>7. Cambios en estos Términos</h2>
    <p>Estos Términos pueden actualizarse periódicamente. La versión vigente siempre estará disponible en esta página.</p>
    <h2>8. Contacto</h2>
    <p>Para cualquier consulta sobre estos Términos, contacte con ${studio} a través de los canales indicados en este sitio.</p>
  `,
  privacyHtml: (studio) => `
    <p>Esta Política de Privacidad describe cómo <strong>${studio}</strong> ("nosotros", "el estudio") recopila, utiliza y protege sus datos personales cuando visita este sitio, reserva una sesión o interactúa con nosotros.</p>
    <h2>1. Información Recopilada</h2>
    <ul>
      <li><strong>Datos de contacto</strong> que usted proporciona (nombre, correo electrónico, teléfono) al reservar, completar formularios o enviar mensajes.</li>
      <li><strong>Datos de la sesión</strong> como fecha, ubicación, paquete y respuestas del briefing.</li>
      <li><strong>Datos de pago</strong> procesados por un proveedor de pagos seguro — no almacenamos los datos completos de la tarjeta en nuestros servidores.</li>
      <li><strong>Fotografías</strong> realizadas durante la sesión y entregadas mediante galerías privadas.</li>
      <li><strong>Datos técnicos</strong> como IP, navegador y páginas visitadas, recopilados mediante cookies y analítica básica.</li>
    </ul>
    <h2>2. Uso de la Información</h2>
    <p>Usamos sus datos para prestar nuestros servicios fotográficos, procesar reservas y pagos, entregar sus fotos, enviar comunicaciones del servicio, mejorar este sitio y cumplir con nuestras obligaciones legales.</p>
    <h2>3. Compartir Información</h2>
    <p>No vendemos sus datos personales. Solo compartimos información con proveedores de confianza que nos ayudan a operar (procesador de pagos, alojamiento de galerías, envío de correos) y únicamente en lo necesario.</p>
    <h2>4. Uso de sus Fotografías</h2>
    <p>Podremos utilizar imágenes seleccionadas en nuestro portafolio, redes sociales o material promocional. Si no desea que sus fotos sean utilizadas públicamente, comuníquenoslo por escrito antes o después de la sesión.</p>
    <h2>5. Sus Derechos</h2>
    <p>Puede solicitar el acceso, la corrección o la eliminación de sus datos personales en cualquier momento, así como retirar el consentimiento para comunicaciones de marketing.</p>
    <h2>6. Retención de Datos</h2>
    <p>Conservamos sus datos personales e imágenes solo durante el tiempo necesario para prestar nuestros servicios y cumplir las obligaciones legales y contables.</p>
    <h2>7. Cookies</h2>
    <p>Este sitio utiliza cookies para funcionalidades básicas y analítica anónima. Puede desactivar las cookies en la configuración de su navegador.</p>
    <h2>8. Contacto</h2>
    <p>Para cualquier consulta sobre privacidad o para ejercer sus derechos, contacte con ${studio} a través de los canales indicados en este sitio.</p>
  `,
};

const all: Record<Lang, LegalTexts> = { en, pt, es };

export function getLegalDefaults(language: string | undefined | null): LegalTexts {
  const key = (language === "pt" || language === "es" || language === "en") ? language : "en";
  return all[key];
}

import React from "react";
import Link from "next/link";
import {
  ChevronLeft,
  FileText,
  ShieldCheck,
  Building2,
  Phone,
  Mail,
  Globe,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import PrintButton from "@/components/PrintButton";

export const metadata = {
  title: "Публичная оферта | Apex",
  description:
    "Публичная оферта о заключении договора об оказании услуг сервиса Apex (apex-core.site).",
};

export default function OfferPage() {
  return (
    <div className="min-h-screen bg-white text-black selection:bg-black selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-neutral-200">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-neutral-600 hover:text-black transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>На главную</span>
            </Link>
            <span className="text-neutral-300">|</span>
            <Link href="/" className="flex items-center gap-2">
              <BrandLogo className="w-5 h-5" />
              <span className="font-heading text-sm font-semibold tracking-tight text-black">
                Apex
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <PrintButton />
            <Link
              href="/login"
              className="btn-bw-primary text-xs !py-2 !px-4"
            >
              Личный кабинет
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 sm:py-16">
        {/* Document Header */}
        <div className="border-b border-neutral-200 pb-8 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 text-neutral-800 text-xs font-medium mb-4">
            <FileText className="w-3.5 h-3.5" />
            <span>Юридический документ</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-semibold text-black tracking-tight leading-tight">
            ПУБЛИЧНАЯ ОФЕРТА
          </h1>
          <p className="text-lg sm:text-xl text-neutral-600 font-light mt-2">
            о заключении договора об оказании услуг
          </p>
          <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-neutral-500 mt-6 pt-4 border-t border-neutral-100">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Действующая редакция
            </span>
            <span>Сайт: <a href="https://www.apex-core.site/" target="_blank" rel="noreferrer" className="underline hover:text-black">https://www.apex-core.site/</a></span>
            <span>Регулируется законодательством РФ (ст. 437 ГК РФ)</span>
          </div>
        </div>

        {/* Quick Section Navigation */}
        <nav aria-label="Содержание документа" className="card-bw p-5 mb-12 bg-neutral-50/60 print:hidden">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-3">
            Содержание оферты
          </p>
          <ol className="grid sm:grid-cols-2 gap-2 text-xs text-neutral-700">
            <li>
              <a href="#section-1" className="hover:text-black hover:underline flex items-center gap-1.5">
                <span className="font-mono text-neutral-400">01.</span> Общие положения и термины
              </a>
            </li>
            <li>
              <a href="#section-2" className="hover:text-black hover:underline flex items-center gap-1.5">
                <span className="font-mono text-neutral-400">02.</span> Предмет Договора
              </a>
            </li>
            <li>
              <a href="#section-3" className="hover:text-black hover:underline flex items-center gap-1.5">
                <span className="font-mono text-neutral-400">03.</span> Права и обязанности Сторон
              </a>
            </li>
            <li>
              <a href="#section-4" className="hover:text-black hover:underline flex items-center gap-1.5">
                <span className="font-mono text-neutral-400">04.</span> Цена и порядок расчетов
              </a>
            </li>
            <li>
              <a href="#section-5" className="hover:text-black hover:underline flex items-center gap-1.5">
                <span className="font-mono text-neutral-400">05.</span> Конфиденциальность и безопасность
              </a>
            </li>
            <li>
              <a href="#section-6" className="hover:text-black hover:underline flex items-center gap-1.5">
                <span className="font-mono text-neutral-400">06.</span> Форс-мажор
              </a>
            </li>
            <li>
              <a href="#section-7" className="hover:text-black hover:underline flex items-center gap-1.5">
                <span className="font-mono text-neutral-400">07.</span> Ответственность Сторон
              </a>
            </li>
            <li>
              <a href="#section-8" className="hover:text-black hover:underline flex items-center gap-1.5">
                <span className="font-mono text-neutral-400">08.</span> Срок действия настоящей Оферты
              </a>
            </li>
            <li>
              <a href="#section-9" className="hover:text-black hover:underline flex items-center gap-1.5">
                <span className="font-mono text-neutral-400">09.</span> Дополнительные условия
              </a>
            </li>
            <li>
              <a href="#section-10" className="hover:text-black hover:underline flex items-center gap-1.5 font-medium text-black">
                <span className="font-mono text-neutral-400">10.</span> Реквизиты Исполнителя
              </a>
            </li>
          </ol>
        </nav>

        {/* Legal Text Body */}
        <div className="space-y-12 text-sm sm:text-base text-neutral-800 leading-relaxed font-sans">
          {/* SECTION 1 */}
          <section id="section-1" className="scroll-mt-24 space-y-4">
            <h2 className="text-xl sm:text-2xl font-heading font-semibold text-black tracking-tight flex items-center gap-2 border-b border-neutral-200 pb-2">
              <span className="text-neutral-400 font-mono text-base sm:text-lg">1.</span>
              Общие положения
            </h2>
            <p>
              В настоящей Публичной оферте содержатся условия заключения Договора об оказании услуг
              (далее по тексту — «Договор об оказании услуг» и/или «Договор»). Настоящей офертой
              признается предложение, адресованное одному или нескольким конкретным лицам, которое
              достаточно определенно и выражает намерение лица, сделавшего предложение, считать себя
              заключившим Договор с адресатом, которым будет принято предложение.
            </p>
            <p>
              Совершение указанных в настоящей Оферте действий является подтверждением согласия
              обеих Сторон заключить Договор об оказании услуг на условиях, в порядке и объеме,
              изложенных в настоящей Оферте.
            </p>
            <p>
              Нижеизложенный текст Публичной оферты является официальным публичным предложением
              Исполнителя, адресованный заинтересованному кругу лиц заключить Договор об оказании услуг
              в соответствии с положениями пункта 2 статьи 437 Гражданского кодекса РФ.
            </p>
            <p>
              Договор об оказании услуг считается заключенным и приобретает силу с момента совершения
              Сторонами действий, предусмотренных в настоящей Оферте, и, означающих безоговорочное, а
              также полное принятие всех условий настоящей Оферты без каких-либо изъятий или
              ограничений на условиях присоединения.
            </p>

            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-5 mt-4 space-y-3">
              <h3 className="font-semibold text-black text-sm uppercase tracking-wide">
                Термины и определения:
              </h3>
              <ul className="space-y-2.5 text-xs sm:text-sm text-neutral-700">
                <li>
                  <strong className="text-black">Договор</strong> — текст настоящей Оферты с
                  Приложениями, являющимися неотъемлемой частью настоящей Оферты, акцептованный
                  Заказчиком путем совершения конклюдентных действий, предусмотренных настоящей
                  Офертой.
                </li>
                <li>
                  <strong className="text-black">Конклюдентные действия</strong> — это поведение,
                  которое выражает согласие с предложением контрагента заключить, изменить или
                  расторгнуть договор. Действия состоят в полном или частичном выполнении условий,
                  которые предложил контрагент.
                </li>
                <li>
                  <strong className="text-black">Сайт Исполнителя в сети «Интернет»</strong> —
                  совокупность программ для электронных вычислительных машин и иной информации,
                  содержащейся в информационной системе, доступ к которой обеспечивается
                  посредством сети «Интернет» по доменному имени и сетевому адресу:{" "}
                  <a
                    href="https://www.apex-core.site/"
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-black underline underline-offset-2"
                  >
                    https://www.apex-core.site/
                  </a>
                </li>
                <li>
                  <strong className="text-black">Стороны Договора (Стороны)</strong> — Исполнитель и
                  Заказчик.
                </li>
                <li>
                  <strong className="text-black">Услуга</strong> — услуга, оказываемая
                  Исполнителем Заказчику в порядке и на условиях, установленных настоящей Офертой.
                </li>
              </ul>
            </div>
          </section>

          {/* SECTION 2 */}
          <section id="section-2" className="scroll-mt-24 space-y-4">
            <h2 className="text-xl sm:text-2xl font-heading font-semibold text-black tracking-tight flex items-center gap-2 border-b border-neutral-200 pb-2">
              <span className="text-neutral-400 font-mono text-base sm:text-lg">2.</span>
              Предмет Договора
            </h2>
            <p>
              <strong className="font-semibold text-black">2.1.</strong> Исполнитель обязуется оказать
              Заказчику Услуги, а Заказчик обязуется оплатить их в размере, порядке и сроки,
              установленные настоящим Договором.
            </p>
            <p>
              <strong className="font-semibold text-black">2.2.</strong> Наименование, количество,
              порядок и иные условия оказания Услуг определяются на основании сведений Исполнителя при
              оформлении заявки Заказчиком, либо устанавливаются на сайте Исполнителя в сети
              «Интернет»{" "}
              <a
                href="https://www.apex-core.site/"
                target="_blank"
                rel="noreferrer"
                className="underline text-black font-medium"
              >
                https://www.apex-core.site/
              </a>
            </p>
            <p>
              <strong className="font-semibold text-black">2.3.</strong> Исполнитель оказывает Услуги
              по настоящему Договору лично, либо с привлечением третьих лиц, при этом за действия
              третьих лиц Исполнитель отвечает перед Заказчиком как за свои собственные.
            </p>
            <p>
              <strong className="font-semibold text-black">2.4.</strong> Договор заключается путем
              акцепта настоящей Оферты через совершение конклюдентных действий, выраженных в:
            </p>
            <ul className="list-disc list-inside pl-2 space-y-1.5 text-neutral-700">
              <li>
                действиях, связанных с регистрацией учетной записи на Сайте Исполнителя в сети
                «Интернет» при наличии необходимости регистрации учетной записи;
              </li>
              <li>
                оформлении и направлении Заказчиком заявки в адрес Исполнителя для оказания Услуг;
              </li>
              <li>действиях, связанных с оплатой Услуг Заказчиком;</li>
              <li>действиях, связанных с оказанием Услуг Исполнителем.</li>
            </ul>
            <p className="text-xs sm:text-sm text-neutral-500 italic">
              Данный перечень неисчерпывающий, могут быть и другие действия, которые ясно выражают
              намерение лица принять предложение контрагента.
            </p>
          </section>

          {/* SECTION 3 */}
          <section id="section-3" className="scroll-mt-24 space-y-6">
            <h2 className="text-xl sm:text-2xl font-heading font-semibold text-black tracking-tight flex items-center gap-2 border-b border-neutral-200 pb-2">
              <span className="text-neutral-400 font-mono text-base sm:text-lg">3.</span>
              Права и обязанности Сторон
            </h2>

            <div className="space-y-3">
              <h3 className="font-heading font-semibold text-base sm:text-lg text-black">
                3.1. Права и обязанности Исполнителя:
              </h3>
              <div className="space-y-2 pl-3 border-l-2 border-black/80">
                <p>
                  <strong className="font-semibold text-black">3.1.1.</strong> Исполнитель обязуется
                  оказать Услуги в соответствии с положениями настоящего Договора, в сроки и объеме,
                  указанные в настоящем Договоре и (или) в порядке, указанном на Сайте Исполнителя.
                </p>
                <p>
                  <strong className="font-semibold text-black">3.1.2.</strong> Исполнитель обязуется
                  предоставлять Заказчику доступ к разделам Сайта, необходимым для получения
                  информации, согласно пункту 2.1. Договора.
                </p>
                <p>
                  <strong className="font-semibold text-black">3.1.3.</strong> Исполнитель несет
                  ответственность за хранение и обработку персональных данных Заказчика, обеспечивает
                  сохранение конфиденциальности этих данных и использует их исключительно для
                  качественного оказания Услуг Заказчику.
                </p>
                <p>
                  <strong className="font-semibold text-black">3.1.4.</strong> Исполнитель оставляет
                  за собой право изменять сроки (период) оказания Услуг и условия настоящей Оферты в
                  одностороннем порядке без предварительного уведомления Заказчика, публикуя указанные
                  изменения на Сайте Исполнителя в сети «Интернет». При этом новые / измененные условия,
                  указываемые на Сайте, действуют только в отношении вновь заключаемых Договоров.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-heading font-semibold text-base sm:text-lg text-black">
                3.2. Права и обязанности Заказчика:
              </h3>
              <div className="space-y-2 pl-3 border-l-2 border-neutral-300">
                <p>
                  <strong className="font-semibold text-black">3.2.1.</strong> Заказчик обязан
                  предоставлять достоверную информацию о себе при получении соответствующих Услуг.
                </p>
                <p>
                  <strong className="font-semibold text-black">3.2.2.</strong> Заказчик обязуется не
                  воспроизводить, не повторять, не копировать, не продавать, а также не использовать в
                  каких бы то ни было целях информацию и материалы, ставшие ему доступными в связи с
                  оказанием Услуг, за исключением личного использования непосредственно самим
                  Заказчиком без предоставления в какой-либо форме доступа каким-либо третьим лицам.
                </p>
                <p>
                  <strong className="font-semibold text-black">3.2.3.</strong> Заказчик обязуется
                  принять Услуги, оказанные Исполнителем;
                </p>
                <p>
                  <strong className="font-semibold text-black">3.2.4.</strong> Заказчик вправе
                  потребовать от Исполнителя вернуть денежные средства за неоказанные услуги,
                  некачественно оказанные услуги, услуги, оказанные с нарушением сроков оказания, а
                  также, если Заказчик решил отказаться от услуг по причинам, не связанным с нарушением
                  обязательств со стороны Исполнителя, исключительно по основаниям, предусмотренным
                  действующим законодательством Российской Федерации.
                </p>
                <p>
                  <strong className="font-semibold text-black">3.2.5.</strong> Заказчик гарантирует,
                  что все условия Договора ему понятны; Заказчик принимает условия без оговорок, а также
                  в полном объеме.
                </p>
              </div>
            </div>
          </section>

          {/* SECTION 4 */}
          <section id="section-4" className="scroll-mt-24 space-y-4">
            <h2 className="text-xl sm:text-2xl font-heading font-semibold text-black tracking-tight flex items-center gap-2 border-b border-neutral-200 pb-2">
              <span className="text-neutral-400 font-mono text-base sm:text-lg">4.</span>
              Цена и порядок расчетов
            </h2>
            <p>
              <strong className="font-semibold text-black">4.1.</strong> Стоимость услуг Исполнителя,
              оказываемых Заказчиком и порядок их оплаты, определяются на основании сведений
              Исполнителя при оформлении заявки Заказчиком либо устанавливаются на Сайте Исполнителя в
              сети «Интернет»:{" "}
              <a
                href="https://www.apex-core.site/"
                target="_blank"
                rel="noreferrer"
                className="underline text-black font-medium"
              >
                https://www.apex-core.site/
              </a>
            </p>
            <p>
              <strong className="font-semibold text-black">4.2.</strong> Все расчеты по Договору
              производятся в безналичном порядке.
            </p>
          </section>

          {/* SECTION 5 */}
          <section id="section-5" className="scroll-mt-24 space-y-4">
            <h2 className="text-xl sm:text-2xl font-heading font-semibold text-black tracking-tight flex items-center gap-2 border-b border-neutral-200 pb-2">
              <span className="text-neutral-400 font-mono text-base sm:text-lg">5.</span>
              Конфиденциальность и безопасность
            </h2>
            <p>
              <strong className="font-semibold text-black">5.1.</strong> При реализации настоящего
              Договора Стороны обеспечивают конфиденциальность и безопасность персональных данных в
              соответствии с актуальной редакцией ФЗ от 27.07.2006 г. № 152-ФЗ «О персональных данных»
              и ФЗ от 27.07.2006 г. № 149-ФЗ «Об информации, информационных технологиях и о защите
              информации».
            </p>
            <p>
              <strong className="font-semibold text-black">5.2.</strong> Стороны обязуются сохранять
              конфиденциальность информации, полученной в ходе исполнения настоящего Договора, и
              принять все возможные меры, чтобы предохранить полученную информацию от разглашения.
            </p>
            <p>
              <strong className="font-semibold text-black">5.3.</strong> Под конфиденциальной
              информацией понимается любая информация, передаваемая Исполнителем и Заказчиком в
              процессе реализации Договора и подлежащая защите, исключения указаны ниже.
            </p>
            <p>
              <strong className="font-semibold text-black">5.4.</strong> Такая информация может
              содержаться в предоставляемых Исполнителю локальных нормативных актах, договорах,
              письмах, отчетах, аналитических материалах, результатах исследований, схемах, графиках,
              спецификациях и других документах, оформленных как на бумажных, так и на электронных
              носителях.
            </p>
          </section>

          {/* SECTION 6 */}
          <section id="section-6" className="scroll-mt-24 space-y-4">
            <h2 className="text-xl sm:text-2xl font-heading font-semibold text-black tracking-tight flex items-center gap-2 border-b border-neutral-200 pb-2">
              <span className="text-neutral-400 font-mono text-base sm:text-lg">6.</span>
              Форс-мажор
            </h2>
            <p>
              <strong className="font-semibold text-black">6.1.</strong> Стороны освобождаются от
              ответственности за неисполнение или ненадлежащее исполнение обязательств по Договору,
              если надлежащее исполнение оказалось невозможным вследствие непреодолимой силы, то есть
              чрезвычайных и непредотвратимых при данных условиях обстоятельств, под которыми
              понимаются: запретные действия властей, эпидемии, блокада, эмбарго, землетрясения,
              наводнения, пожары или другие стихийные бедствия.
            </p>
            <p>
              <strong className="font-semibold text-black">6.2.</strong> В случае наступления этих
              обстоятельств Сторона обязана в течение 30 (Тридцати) рабочих дней уведомить об этом
              другую Сторону.
            </p>
            <p>
              <strong className="font-semibold text-black">6.3.</strong> Документ, выданный
              уполномоченным государственным органом, является достаточным подтверждением наличия и
              продолжительности действия непреодолимой силы.
            </p>
            <p>
              <strong className="font-semibold text-black">6.4.</strong> Если обстоятельства
              непреодолимой силы продолжают действовать более 60 (Шестидесяти) рабочих дней, то каждая
              Сторона вправе отказаться от настоящего Договора в одностороннем порядке.
            </p>
          </section>

          {/* SECTION 7 */}
          <section id="section-7" className="scroll-mt-24 space-y-4">
            <h2 className="text-xl sm:text-2xl font-heading font-semibold text-black tracking-tight flex items-center gap-2 border-b border-neutral-200 pb-2">
              <span className="text-neutral-400 font-mono text-base sm:text-lg">7.</span>
              Ответственность Сторон
            </h2>
            <p>
              <strong className="font-semibold text-black">7.1.</strong> В случае неисполнения и/или
              ненадлежащего исполнения своих обязательств по Договору, Стороны несут ответственность в
              соответствии с условиями настоящей Оферты.
            </p>
            <p>
              <strong className="font-semibold text-black">7.2.</strong> Исполнитель не несет
              ответственности за неисполнение и/или ненадлежащее исполнение обязательств по Договору,
              если такое неисполнение и/или ненадлежащее исполнение произошло по вине Заказчика.
            </p>
            <p>
              <strong className="font-semibold text-black">7.3.</strong> Сторона, не исполнившая или
              ненадлежащим образом исполнившая обязательства по Договору, обязана возместить другой
              Стороне причиненные такими нарушениями убытки.
            </p>
          </section>

          {/* SECTION 8 */}
          <section id="section-8" className="scroll-mt-24 space-y-4">
            <h2 className="text-xl sm:text-2xl font-heading font-semibold text-black tracking-tight flex items-center gap-2 border-b border-neutral-200 pb-2">
              <span className="text-neutral-400 font-mono text-base sm:text-lg">8.</span>
              Срок действия настоящей Оферты
            </h2>
            <p>
              <strong className="font-semibold text-black">8.1.</strong> Оферта вступает в силу с
              момента размещения на Сайте Исполнителя и действует до момента её отзыва Исполнителем.
            </p>
            <p>
              <strong className="font-semibold text-black">8.2.</strong> Исполнитель оставляет за
              собой право внести изменения в условия Оферты и/или отозвать Оферту в любой момент по
              своему усмотрению. Сведения об изменении или отзыве Оферты доводятся до Заказчика по
              выбору Исполнителя посредством размещения на сайте Исполнителя в сети «Интернет», в
              Личном кабинете Заказчика, либо путем направления соответствующего уведомления на
              электронный или почтовый адрес, указанный Заказчиком при заключении Договора или в ходе
              его исполнения.
            </p>
            <p>
              <strong className="font-semibold text-black">8.3.</strong> Договор вступает в силу с
              момента Акцепта условий Оферты Заказчиком и действует до полного исполнения Сторонами
              обязательств по Договору.
            </p>
            <p>
              <strong className="font-semibold text-black">8.4.</strong> Изменения, внесенные
              Исполнителем в Договор и опубликованные на сайте в форме актуализированной Оферты,
              считаются принятыми Заказчиком в полном объеме.
            </p>
          </section>

          {/* SECTION 9 */}
          <section id="section-9" className="scroll-mt-24 space-y-4">
            <h2 className="text-xl sm:text-2xl font-heading font-semibold text-black tracking-tight flex items-center gap-2 border-b border-neutral-200 pb-2">
              <span className="text-neutral-400 font-mono text-base sm:text-lg">9.</span>
              Дополнительные условия
            </h2>
            <p>
              <strong className="font-semibold text-black">9.1.</strong> Договор, его заключение и
              исполнение регулируется действующим законодательством Российской Федерации. Все вопросы,
              не урегулированные настоящей Офертой или урегулированные не полностью, регулируются в
              соответствии с материальным правом Российской Федерации.
            </p>
            <p>
              <strong className="font-semibold text-black">9.2.</strong> В случае возникновения
              спора, который может возникнуть между Сторонами в ходе исполнения ими своих
              обязательств по Договору, заключенному на условиях настоящей Оферты, Стороны обязаны
              урегулировать спор мирным путем до начала судебного разбирательства. Судебное
              разбирательство осуществляется в соответствии с законодательством Российской Федерации.
              Споры или разногласия, по которым Стороны не достигли договоренности, подлежат
              разрешению в соответствии с законодательством РФ. Досудебный порядок урегулирования
              спора является обязательным.
            </p>
            <p>
              <strong className="font-semibold text-black">9.3.</strong> В качестве языка Договора,
              заключаемого на условиях настоящей Оферты, а также языка, используемого при любом
              взаимодействии Сторон (включая ведение переписки, предоставление требований /
              уведомлений / разъяснений, предоставление документов и т. д.), Стороны определили
              русский язык.
            </p>
            <p>
              <strong className="font-semibold text-black">9.4.</strong> Все документы, подлежащие
              предоставлению в соответствии с условиями настоящей Оферты, должны быть составлены на
              русском языке либо иметь перевод на русский язык, удостоверенный в установленном порядке.
            </p>
            <p>
              <strong className="font-semibold text-black">9.5.</strong> Бездействие одной из Сторон в
              случае нарушения условий настоящей Оферты не лишает права заинтересованной Стороны
              осуществлять защиту своих интересов позднее, а также не означает отказа от своих прав в
              случае совершения одной из Сторон подобных либо сходных нарушений в будущем.
            </p>
            <p>
              <strong className="font-semibold text-black">9.6.</strong> Если на Сайте Исполнителя в
              сети «Интернет» есть ссылки на другие веб-сайты и материалы третьих лиц, такие ссылки
              размещены исключительно в целях информирования, и Исполнитель не имеет контроля в
              отношении содержания таких сайтов или материалов. Исполнитель не несет ответственность за
              любые убытки или ущерб, которые могут возникнуть в результате использования таких ссылок.
            </p>
          </section>

          {/* SECTION 10 */}
          <section id="section-10" className="scroll-mt-24 space-y-5 pt-4">
            <h2 className="text-xl sm:text-2xl font-heading font-semibold text-black tracking-tight flex items-center gap-2 border-b border-neutral-200 pb-2">
              <span className="text-neutral-400 font-mono text-base sm:text-lg">10.</span>
              Реквизиты Исполнителя
            </h2>

            <div className="card-bw p-6 sm:p-8 bg-neutral-50/50 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-neutral-200">
                  <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                    <Building2 className="w-4 h-4 text-black" />
                    ИНН
                  </div>
                  <p className="text-lg font-mono font-semibold text-black mt-1">920159216794</p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-neutral-200">
                  <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                    <Phone className="w-4 h-4 text-black" />
                    Контактный телефон
                  </div>
                  <p className="text-lg font-medium text-black mt-1">
                    <a href="tel:+79944821648" className="hover:underline">
                      +7 994 482-16-48
                    </a>
                  </p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-neutral-200">
                  <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                    <Mail className="w-4 h-4 text-black" />
                    Контактный e-mail
                  </div>
                  <p className="text-base font-medium text-black mt-1">
                    <a href="mailto:w1t3chlyyy@gmail.com" className="hover:underline">
                      w1t3chlyyy@gmail.com
                    </a>
                  </p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-neutral-200">
                  <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                    <Globe className="w-4 h-4 text-black" />
                    Сайт Исполнителя
                  </div>
                  <p className="text-base font-medium text-black mt-1">
                    <a
                      href="https://www.apex-core.site/"
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline inline-flex items-center gap-1"
                    >
                      apex-core.site
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </p>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2 text-xs text-neutral-500">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Договор заключается в электронном виде на основании акцепта оферты.</span>
              </div>
            </div>
          </section>
        </div>

        {/* Bottom CTA / Back to home */}
        <div className="mt-16 pt-8 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-black hover:opacity-80 transition-opacity"
          >
            <ChevronLeft className="w-4 h-4" />
            Вернуться на главную страницу Apex
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-bw-secondary text-xs">
              Войти в личный кабинет
            </Link>
            <a href="https://t.me/w1t3chlyyy" target="_blank" rel="noreferrer" className="btn-bw-primary text-xs">
              Задать вопрос поддержке
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 py-8 px-6 bg-white print:hidden">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <div className="flex items-center gap-2">
            <BrandLogo className="w-4 h-4" />
            <span>Apex © {new Date().getFullYear()}. Все права защищены.</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/offer" className="font-semibold text-black underline">
              Публичная оферта
            </Link>
            <Link href="/" className="hover:text-black">
              Главная
            </Link>
            <Link href="/login" className="hover:text-black">
              Дашборд
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

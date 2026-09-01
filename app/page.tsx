"use client";

import { motion } from "motion/react";
import Link from "next/link";
import {
  Plus,
  ArrowRight,
  Bot,
  Database,
  Send,
  UserCheck,
  BarChart3,
  CheckCircle2,
  XCircle,
  Zap,
  Shield,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import DemoChat from "@/components/DemoChat";
import SupportContact from "@/components/SupportContact";
import BrandLogo from "@/components/BrandLogo";
import { buildSupportTelegramLink } from "@/lib/support";

const EASE = [0.16, 1, 0.3, 1] as const;

export default function HeroPage() {
  return (
    <div className="w-full bg-white text-black min-h-screen">
      {/* ========================================================================= */}
      {/* 1. HERO SECTION (Minimal Black & White with Fullscreen Video)             */}
      {/* ========================================================================= */}
      <section className="hero-container" id="hero-landing">
        {/* Background Video Layer */}
        <div className="video-background-layer" id="background-video-container">
          <motion.div
            className="video-wrapper"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.8, ease: EASE }}
          >
            <video
              className="bg-video"
              autoPlay
              muted
              loop
              playsInline
              src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260508_215831_c6a8989c-d716-4d8d-8745-e972a2eec711.mp4"
            />
          </motion.div>
        </div>

        {/* Fixed Top Navbar */}
        <motion.nav
          className="navbar"
          id="top-navbar"
          initial={{ y: -16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: EASE }}
        >
          {/* Left Side */}
          <div className="navbar-left" id="nav-left">
            <Link href="/" className="brand-logo-group" id="brand-logo">
              <BrandLogo className="w-6 h-6" />
              <span className="brand-name">Apex</span>
            </Link>

            <a href="#features" className="menu-btn-pill" id="menu-button" aria-label="Open menu">
              <span className="menu-circle-icon">
                <Plus size={12} strokeWidth={3} />
              </span>
              <span className="menu-btn-text">Разделы</span>
            </a>

            <div className="tags-pill-desktop" id="desktop-tags-pill">
              <a href="#demo-chat" className="tag-label-text">
                AI Demo Chat
              </a>
              <span className="tag-label-separator" />
              <a href="#features" className="tag-label-text">
                Возможности
              </a>
              <span className="tag-label-separator" />
              <a href="#pricing" className="tag-label-text">
                Тарифы
              </a>
              <span className="tag-label-separator" />
              <a href="#support" className="tag-label-text">
                Поддержка
              </a>
            </div>
          </div>

          {/* Right Side */}
          <div className="navbar-right" id="nav-right">
            <Link href="/login" className="adaptive-pill" id="adaptive-systems-pill">
              <span className="grid-circle-btn" aria-hidden="true">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="3.5" cy="3.5" r="1.25" fill="#ffffff" />
                  <circle cx="8.5" cy="3.5" r="1.25" fill="#ffffff" />
                  <circle cx="3.5" cy="8.5" r="1.25" fill="#ffffff" />
                  <circle cx="8.5" cy="8.5" r="1.25" fill="#ffffff" />
                </svg>
              </span>
              <span className="adaptive-label-text">Личный кабинет</span>
            </Link>
          </div>
        </motion.nav>

        {/* Spacer to push footer to bottom */}
        <div style={{ flex: 1 }} />

        {/* Hero Bottom Banner */}
        <motion.div
          className="footer-container"
          id="footer-hero-section"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 1, ease: EASE }}
        >
          <div className="footer-inner">
            {/* Left Block */}
            <div className="footer-left" id="footer-left-block">
              <motion.div
                className="subtitle-line"
                id="subtitle-line"
                initial={{ y: 16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.8, ease: EASE }}
              >
                <span className="subtitle-dot" />
                <span className="subtitle-text">Внедряй агента за 5 минут и отдыхай</span>
              </motion.div>

              <motion.h1
                className="hero-heading"
                id="hero-heading"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.8, ease: EASE }}
              >
                AI отвечает. 
                <br />
                AI продаёт. Круглосуточно.
              </motion.h1>

              <motion.div
                className="buttons-row"
                id="cta-buttons-row"
                initial={{ y: 16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1.0, duration: 0.8, ease: EASE }}
              >
                <a href="#demo-chat" className="btn-primary-pill" id="btn-see-features">
                  Попробовать демо
                </a>
                <a href="#how-it-works" className="btn-secondary-pill" id="btn-how-it-works">
                  Как это работает
                </a>
                <Link href="/login" className="btn-secondary-pill">
                  Вход в дашборд
                </Link>
              </motion.div>
            </div>

            {/* Right Block Tags */}
            <motion.div
              className="footer-right"
              id="footer-right-tags"
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.8, ease: EASE }}
            >
              <span className="tag-pill-white" id="tag-neuromorphic">
                RAG Knowledge
              </span>
              <span className="tag-pill-white" id="tag-agi">
                Telegram Business API
              </span>
              <span className="tag-pill-white" id="tag-cybernetics">
                24/7 Autonomous
              </span>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ========================================================================= */}
      {/* 2. INTERACTIVE DEMO CHAT SECTION                                          */}
      {/* ========================================================================= */}
      <section className="py-24 px-6 md:px-12 border-t border-neutral-200 bg-neutral-50/50" id="demo-chat">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-200 text-black text-xs font-semibold uppercase tracking-wider mb-4">
              <Bot className="w-3.5 h-3.5" />
              Интерактивное демо
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-light tracking-tight text-black">
              Протестируйте AI-ассистента в действии
            </h2>
            <p className="text-sm sm:text-base text-neutral-600 mt-4 leading-relaxed">
              Задайте вопрос по тарифам, настройке Telegram Business или принципам работы базы знаний RAG.
            </p>
          </div>

          <div className="grid lg:grid-cols-12 gap-10 items-center">
            {/* Left Column: Key Highlights */}
            <div className="lg:col-span-5 space-y-6">
              <div className="card-bw p-6 md:p-7 bg-white">
                <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center mb-4">
                  <Zap className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-black">Мгновенный ответ &lt; 1 сек</h3>
                <p className="text-xs sm:text-sm text-neutral-600 mt-2 leading-relaxed">
                  Клиент получает точную консультацию сразу в момент интереса без ожидания свободного оператора.
                </p>
              </div>

              <div className="card-bw p-6 md:p-7 bg-white">
                <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center mb-4">
                  <Database className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-black">Точность по вашей базе знаний</h3>
                <p className="text-xs sm:text-sm text-neutral-600 mt-2 leading-relaxed">
                  ИИ отвечает строго по загруженным регламентам, прайс-листам и документам, исключая галлюцинации.
                </p>
              </div>

              <div className="card-bw p-6 md:p-7 bg-white">
                <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center mb-4">
                  <UserCheck className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-black">Бесшовная передача менеджеру</h3>
                <p className="text-xs sm:text-sm text-neutral-600 mt-2 leading-relaxed">
                  Если вопрос требует нестандартного решения, бот мгновенно уведомит живого специалиста.
                </p>
              </div>
            </div>

            {/* Right Column: Live Chat Interface */}
            <div className="lg:col-span-7">
              <DemoChat />
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. FEATURES / CAPABILITIES                                                */}
      {/* ========================================================================= */}
      <section className="py-24 px-6 md:px-12 border-t border-neutral-200 bg-white" id="features">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-neutral-100 text-black text-xs font-semibold tracking-wider uppercase mb-3">
                Функционал
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-light tracking-tight text-black">
                Полный контроль продаж и сервиса
              </h2>
            </div>
            <p className="text-sm text-neutral-600 max-w-md">
              Всё необходимое для масштабирования клиентского сервиса в Telegram без расширения штата операторов.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <div className="card-bw p-6 flex flex-col justify-between hover:-translate-y-1 transition-transform bg-neutral-50/60">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center mb-5">
                  <Database className="w-5 h-5" />
                </div>
                <span className="text-xs font-mono text-neutral-400">01 / RAG</span>
                <h3 className="text-lg font-semibold text-black mt-2">База знаний RAG</h3>
                <p className="text-xs text-neutral-600 mt-2 leading-relaxed">
                  Векторный поиск по каталогам, PDF и FAQ для безошибочных ответов на любые вопросы.
                </p>
              </div>
              <div className="pt-6 mt-6 border-t border-neutral-200/80 flex items-center gap-1.5 text-xs font-medium text-black">
                <span>Подробнее</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Feature 2 */}
            <div className="card-bw p-6 flex flex-col justify-between hover:-translate-y-1 transition-transform bg-neutral-50/60">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center mb-5">
                  <Send className="w-5 h-5 -rotate-12" />
                </div>
                <span className="text-xs font-mono text-neutral-400">02 / API</span>
                <h3 className="text-lg font-semibold text-black mt-2">Telegram Business</h3>
                <p className="text-xs text-neutral-600 mt-2 leading-relaxed">
                  Официальное подключение прямо к вашему бизнес-аккаунту Telegram за пару кликов.
                </p>
              </div>
              <div className="pt-6 mt-6 border-t border-neutral-200/80 flex items-center gap-1.5 text-xs font-medium text-black">
                <span>Подробнее</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Feature 3 */}
            <div className="card-bw p-6 flex flex-col justify-between hover:-translate-y-1 transition-transform bg-neutral-50/60">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center mb-5">
                  <UserCheck className="w-5 h-5" />
                </div>
                <span className="text-xs font-mono text-neutral-400">03 / HANDOVER</span>
                <h3 className="text-lg font-semibold text-black mt-2">Эскалация на оператора</h3>
                <p className="text-xs text-neutral-600 mt-2 leading-relaxed">
                  Умное определение готовности к покупке и передача горячего лида сотруднику в CRM.
                </p>
              </div>
              <div className="pt-6 mt-6 border-t border-neutral-200/80 flex items-center gap-1.5 text-xs font-medium text-black">
                <span>Подробнее</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Feature 4 */}
            <div className="card-bw p-6 flex flex-col justify-between hover:-translate-y-1 transition-transform bg-neutral-50/60">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center mb-5">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <span className="text-xs font-mono text-neutral-400">04 / ANALYTICS</span>
                <h3 className="text-lg font-semibold text-black mt-2">Сквозная аналитика</h3>
                <p className="text-xs text-neutral-600 mt-2 leading-relaxed">
                  Статистика диалогов, конверсий, популярных запросов и времени закрытия сделок.
                </p>
              </div>
              <div className="pt-6 mt-6 border-t border-neutral-200/80 flex items-center gap-1.5 text-xs font-medium text-black">
                <span>Подробнее</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. HOW IT WORKS (3 Simple Steps)                                         */}
      {/* ========================================================================= */}
      <section className="py-24 px-6 md:px-12 border-t border-neutral-200 bg-neutral-50/40" id="how-it-works">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-block px-3 py-1 rounded-full bg-neutral-200 text-black text-xs font-semibold tracking-wider uppercase mb-3">
              Процесс
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-light tracking-tight text-black">
              Запуск за 3 простых шага
            </h2>
            <p className="text-sm text-neutral-600 mt-3">
              Без программистов и сложных интеграций. Настройка занимает менее 10 минут.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="card-bw p-8 bg-white relative">
              <span className="text-4xl font-light text-neutral-300 font-mono">01</span>
              <h3 className="text-xl font-semibold text-black mt-4">Подключите токен</h3>
              <p className="text-xs sm:text-sm text-neutral-600 mt-2 leading-relaxed">
                Получите токен в @BotFather и привяжите его в настройках Telegram Business в вашем личном кабинете.
              </p>
            </div>

            {/* Step 2 */}
            <div className="card-bw p-8 bg-white relative">
              <span className="text-4xl font-light text-neutral-300 font-mono">02</span>
              <h3 className="text-xl font-semibold text-black mt-4">Добавьте базу знаний</h3>
              <p className="text-xs sm:text-sm text-neutral-600 mt-2 leading-relaxed">
                Вставьте ответы на частые вопросы, описание услуг или регламенты компании в разделе RAG.
              </p>
            </div>

            {/* Step 3 */}
            <div className="card-bw p-8 bg-white relative">
              <span className="text-4xl font-light text-neutral-300 font-mono">03</span>
              <h3 className="text-xl font-semibold text-black mt-4">Запустите продажи 24/7</h3>
              <p className="text-xs sm:text-sm text-neutral-600 mt-2 leading-relaxed">
                Ассистент начнет мгновенно отвечать клиентам, квалифицировать лиды и принимать заявки.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. AUDIENCE / USE CASES                                                   */}
      {/* ========================================================================= */}
      <section className="py-24 px-6 md:px-12 border-t border-neutral-200 bg-white" id="audience">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-block px-3 py-1 rounded-full bg-neutral-100 text-black text-xs font-semibold tracking-wider uppercase mb-3">
              Для кого
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-light tracking-tight text-black">
              Решения под любые ниши
            </h2>
            <p className="text-sm text-neutral-600 mt-3">
              Автоматизация рутины и увеличение конверсии в Telegram для любого формата бизнеса.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card-bw p-6 bg-neutral-50/50">
              <h3 className="text-lg font-semibold text-black">E-commerce</h3>
              <p className="text-xs text-neutral-600 mt-2 leading-relaxed">
                Консультации по каталогу, подбор размеров, проверка наличия и оформления заказов 24/7.
              </p>
            </div>

            <div className="card-bw p-6 bg-neutral-50/50">
              <h3 className="text-lg font-semibold text-black">Сфера услуг</h3>
              <p className="text-xs text-neutral-600 mt-2 leading-relaxed">
                Запись на консультации, расчет стоимости, напоминания о визитах и ответы на типовые вопросы.
              </p>
            </div>

            <div className="card-bw p-6 bg-neutral-50/50">
              <h3 className="text-lg font-semibold text-black">Инфобизнес</h3>
              <p className="text-xs text-neutral-600 mt-2 leading-relaxed">
                Прогрев лидов, выдача материалов, ответы по программам курсов и прием оплат.
              </p>
            </div>

            <div className="card-bw p-6 bg-neutral-50/50">
              <h3 className="text-lg font-semibold text-black">B2B продажи</h3>
              <p className="text-xs text-neutral-600 mt-2 leading-relaxed">
                Первичный сбор требований, квалификация входящего трафика и передача КП лицу, принимающему решения.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. COMPARISON MATRIX (AI vs Operator)                                     */}
      {/* ========================================================================= */}
      <section className="py-24 px-6 md:px-12 border-t border-neutral-200 bg-neutral-50/50" id="comparison">
        <div className="max-w-4xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-14">
            <span className="inline-block px-3 py-1 rounded-full bg-neutral-200 text-black text-xs font-semibold tracking-wider uppercase mb-3">
              Сравнение
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-light tracking-tight text-black">
              AI-ассистент vs Штатный оператор
            </h2>
            <p className="text-sm text-neutral-600 mt-3">
              Экономия до 80% затрат на клиентский сервис при 10-кратном росте скорости.
            </p>
          </div>

          <div className="card-bw overflow-hidden bg-white">
            <div className="grid grid-cols-3 p-4 md:p-6 border-b border-neutral-200 bg-neutral-100/70 font-semibold text-xs md:text-sm text-black">
              <div>Параметр</div>
              <div className="text-center">AI Ассистент</div>
              <div className="text-center text-neutral-500">Штатный сотрудник</div>
            </div>

            <div className="divide-y divide-neutral-100 text-xs md:text-sm">
              <div className="grid grid-cols-3 p-4 md:p-5 items-center">
                <div className="font-medium text-black">Скорость ответа</div>
                <div className="text-center font-semibold text-black flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-black" />
                  &lt; 1 секунды
                </div>
                <div className="text-center text-neutral-500">5 – 30 минут</div>
              </div>

              <div className="grid grid-cols-3 p-4 md:p-5 items-center bg-neutral-50/50">
                <div className="font-medium text-black">Режим работы</div>
                <div className="text-center font-semibold text-black flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-black" />
                  24/7/365 без пауз
                </div>
                <div className="text-center text-neutral-500">8ч в будни + отпуска</div>
              </div>

              <div className="grid grid-cols-3 p-4 md:p-5 items-center">
                <div className="font-medium text-black">Стоимость в месяц</div>
                <div className="text-center font-semibold text-black flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-black" />
                  от 1 490 ₽
                </div>
                <div className="text-center text-neutral-500">от 50 000 ₽</div>
              </div>

              <div className="grid grid-cols-3 p-4 md:p-5 items-center bg-neutral-50/50">
                <div className="font-medium text-black">Параллельные диалоги</div>
                <div className="text-center font-semibold text-black flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-black" />
                  Неограниченно
                </div>
                <div className="text-center text-neutral-500">1 – 2 диалога</div>
              </div>

              <div className="grid grid-cols-3 p-4 md:p-5 items-center">
                <div className="font-medium text-black">Соблюдение регламентов</div>
                <div className="text-center font-semibold text-black flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-black" />
                  100% точно по RAG
                </div>
                <div className="text-center text-neutral-500">Человеческий фактор</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. PRICING PLANS                                                          */}
      {/* ========================================================================= */}
      <section className="py-24 px-6 md:px-12 border-t border-neutral-200 bg-white" id="pricing">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-block px-3 py-1 rounded-full bg-neutral-100 text-black text-xs font-semibold tracking-wider uppercase mb-3">
              Тарифы
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-light tracking-tight text-black">
              Прозрачные тарифные планы
            </h2>
            <p className="text-sm text-neutral-600 mt-3">
              Выберите подходящий тариф для вашего объема диалогов. Без скрытых платежей.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 items-stretch">
            {/* Plan 1 */}
            <div className="card-bw p-8 flex flex-col justify-between bg-neutral-50/40">
              <div>
                <h3 className="text-xl font-semibold text-black">Старт</h3>
                <p className="text-xs text-neutral-500 mt-1">Для небольших проектов</p>
                <div className="my-6">
                  <span className="text-4xl font-light text-black">1 490 ₽</span>
                  <span className="text-xs text-neutral-500"> / месяц</span>
                </div>
                <ul className="space-y-3 text-xs sm:text-sm text-neutral-700">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-black shrink-0" />
                    <span>До 50 сообщений в месяц</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-black shrink-0" />
                    <span>1 Telegram Business бот</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-black shrink-0" />
                    <span>База знаний до 50 статей</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-black shrink-0" />
                    <span>Базовая аналитика</span>
                  </li>
                </ul>
              </div>
              <div className="pt-8">
                <a
                  href={buildSupportTelegramLink("Старт")}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-bw-secondary w-full"
                >
                  Выбрать «Старт»
                </a>
              </div>
            </div>

            {/* Plan 2 (Featured - Black) */}
            <div className="card-bw-dark p-8 flex flex-col justify-between shadow-2xl relative">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-white text-black text-[11px] font-semibold uppercase tracking-wider px-3.5 py-1 rounded-full shadow-sm">
                Популярный выбор
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Бизнес</h3>
                <p className="text-xs text-neutral-400 mt-1">Для растущих продаж и сервиса</p>
                <div className="my-6">
                  <span className="text-4xl font-light text-white">3 990 ₽</span>
                  <span className="text-xs text-neutral-400"> / месяц</span>
                </div>
                <ul className="space-y-3 text-xs sm:text-sm text-neutral-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                    <span>До 5 000 сообщений в месяц</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                    <span>3 Telegram Business бота</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                    <span>Неограниченная база знаний RAG</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                    <span>Эскалация на оператора + Webhook</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                    <span>Приоритетная поддержка 24/7</span>
                  </li>
                </ul>
              </div>
              <div className="pt-8">
                <a
                  href={buildSupportTelegramLink("Бизнес")}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center w-full bg-white text-black text-sm font-medium py-3 rounded-full hover:bg-neutral-200 transition-colors"
                >
                  Выбрать «Бизнес»
                </a>
              </div>
            </div>

            {/* Plan 3 */}
            <div className="card-bw p-8 flex flex-col justify-between bg-neutral-50/40">
              <div>
                <h3 className="text-xl font-semibold text-black">Enterprise</h3>
                <p className="text-xs text-neutral-500 mt-1">Для крупных компаний и сетей</p>
                <div className="my-6">
                  <span className="text-4xl font-light text-black">8 990 ₽</span>
                  <span className="text-xs text-neutral-500"> / месяц</span>
                </div>
                <ul className="space-y-3 text-xs sm:text-sm text-neutral-700">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-black shrink-0" />
                    <span>Неограниченное число сообщений</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-black shrink-0" />
                    <span>Любое количество ботов</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-black shrink-0" />
                    <span>Индивидуальная доработка под CRM</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-black shrink-0" />
                    <span>Персональный аккаунт-менеджер</span>
                  </li>
                </ul>
              </div>
              <div className="pt-8">
                <a
                  href={buildSupportTelegramLink("Enterprise")}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-bw-secondary w-full"
                >
                  Запросить Enterprise
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. SUPPORT & CONSULTATION FORM                                            */}
      {/* ========================================================================= */}
      <section className="py-24 px-6 md:px-12 border-t border-neutral-200 bg-neutral-50/50" id="support">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-block px-3 py-1 rounded-full bg-neutral-200 text-black text-xs font-semibold tracking-wider uppercase mb-3">
              Поддержка
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-light tracking-tight text-black">
              Служба заботы и консультация
            </h2>
            <p className="text-sm text-neutral-600 mt-3">
              Есть вопросы или требуется помощь с интеграцией? Ответим в течение 5 минут.
            </p>
          </div>

          <SupportContact />
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 9. GLOBAL MONOCHROME FOOTER                                               */}
      {/* ========================================================================= */}
      <footer className="border-t border-neutral-200 py-12 px-6 md:px-12 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
            <BrandLogo className="w-6 h-6" />
            <span className="text-sm font-semibold text-black tracking-tight">
              Apex
            </span>
            <span className="text-xs text-neutral-400">
              © {new Date().getFullYear()} Все права защищены.
            </span>
          </div>

          <div className="flex items-center gap-6 text-xs text-neutral-600">
            <a href="#demo-chat" className="hover:text-black transition-colors">
              Демо-чат
            </a>
            <a href="#features" className="hover:text-black transition-colors">
              Возможности
            </a>
            <a href="#how-it-works" className="hover:text-black transition-colors">
              Процесс
            </a>
            <a href="#pricing" className="hover:text-black transition-colors">
              Тарифы
            </a>
            <a href="#support" className="hover:text-black transition-colors">
              Поддержка
            </a>
            <Link href="/dashboard" className="font-semibold text-black hover:underline">
              Дашборд
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

import { defineComponent } from 'vue'
import { useServices } from 'services'
import { AppearanceTheme, useMainSettingsStore } from 'store/mainSettings'
import { useMessageJournalStore } from 'store/messageJournal'
import { useSettingsStore } from 'store/settings'
import { useUsageStore } from 'store/usage'
import { useGlobalModal, useModal, useViewer } from 'hooks'
import { isMacOS, USAGE_COUNTER_ENDPOINT, USAGE_COUNTER_OWNER_ID } from 'misc/constants'
import { electronBridge } from 'misc/electronBridge'
import { playNotificationSound } from 'misc/notificationSound'
import { NOTIFICATION_SOUNDS, NotificationSoundId } from 'misc/notificationSounds'
import { ACCENT_PRESETS } from 'ui/app/App/useAppearanceColors'
import { Modal } from 'ui/modals/parts'
import { ColorPicker } from 'ui/modals/SettingsModal/ColorPicker'
import { Button } from 'ui/ui/Button/Button'
import { Checkbox } from 'ui/ui/Checkbox/Checkbox'
import { Select } from 'ui/ui/Select/Select'
import './SettingsModal.css'

/** Оттенки для своих сообщений: спокойнее акцентных, чтобы текст оставался читаемым */
const BUBBLE_PRESETS = [
  '#cce4ff',
  '#d7e3fc',
  '#e0d7fc',
  '#f3d7ee',
  '#fbd9d3',
  '#fdecc8',
  '#d8ecd6',
  '#d2eae7',
  '#454647',
  '#3a4a5c'
]

export const SettingsModal = defineComponent(() => {
  const { lang } = useServices()
  const mainSettings = useMainSettingsStore()
  const settings = useSettingsStore()
  const journal = useMessageJournalStore()
  const usage = useUsageStore()
  const viewer = useViewer()
  const { journalModal, settingsModal } = useGlobalModal()
  const changeWindowSettingModal = useModal()

  /** Само число видит только владелец сборки, отправляют все */
  const isCounterOwner = USAGE_COUNTER_OWNER_ID === 0 || viewer.id === USAGE_COUNTER_OWNER_ID

  const THEME_OPTIONS: Array<{ label: string, value: AppearanceTheme }> = [
    { label: lang.use('settings_theme_system'), value: 'system' },
    { label: lang.use('settings_theme_light'), value: 'light' },
    { label: lang.use('settings_theme_dark'), value: 'dark' }
  ]

  const SOUND_OPTIONS: Array<{ label: string, value: NotificationSoundId }> =
    NOTIFICATION_SOUNDS.map(({ id }) => ({
      label: lang.use(`settings_sound_${id}`),
      value: id
    }))

  const resetColors = () => {
    settings.accentColor = null
    settings.outgoingMessageColor = null
  }

  return () => (
    <Modal
      opened={settingsModal.opened}
      onClose={settingsModal.close}
      onVisibilityChange={settingsModal.onVisibilityChange}
      title={lang.use('settings_title')}
      class="SettingsModal"
    >
      <div class="SettingsModal__section">
        <span class="SettingsModal__sectionTitle">{lang.use('settings_section_appearance')}</span>

        <div class="SettingsModal__selectWrapper">
          {lang.use('settings_theme_description')}
          <Select
            class="SettingsModal__select"
            selected={mainSettings.appearance.theme}
            onSelect={(theme) => (mainSettings.appearance.theme = theme)}
            options={THEME_OPTIONS}
          />
        </div>

        <ColorPicker
          label={lang.use('settings_color_accent')}
          presets={ACCENT_PRESETS}
          value={settings.accentColor}
          onChange={(value) => (settings.accentColor = value)}
        />

        <ColorPicker
          label={lang.use('settings_color_outgoing')}
          presets={BUBBLE_PRESETS}
          value={settings.outgoingMessageColor}
          onChange={(value) => (settings.outgoingMessageColor = value)}
        />

        {(settings.accentColor || settings.outgoingMessageColor) && (
          <Button mode="secondary" size="small" onClick={resetColors}>
            {lang.use('settings_color_reset_all')}
          </Button>
        )}
      </div>

      <div class="SettingsModal__section">
        <span class="SettingsModal__sectionTitle">
          {lang.use('settings_section_notifications')}
        </span>

        <Checkbox
          label={lang.use('settings_notifications_popup')}
          checked={settings.notifications}
          onChange={(checked) => (settings.notifications = checked)}
        />

        {settings.notifications && (
          <Checkbox
            label={lang.use('settings_notifications_show_text')}
            checked={settings.notificationShowText}
            onChange={(checked) => (settings.notificationShowText = checked)}
          />
        )}

        <Checkbox
          label={lang.use('settings_notifications_sound')}
          checked={settings.notificationSound}
          onChange={(checked) => (settings.notificationSound = checked)}
        />

        {settings.notificationSound && (
          <>
            <div class="SettingsModal__selectWrapper">
              {lang.use('settings_notifications_melody')}
              <Select
                class="SettingsModal__select"
                selected={settings.notificationSoundId}
                onSelect={(id) => {
                  settings.notificationSoundId = id
                  // Сразу проигрываем: выбирать звук вслепую по названию неудобно
                  playNotificationSound(id, settings.notificationVolume)
                }}
                options={SOUND_OPTIONS}
              />
            </div>

            <div class="SettingsModal__volume">
              <span class="SettingsModal__volumeLabel">
                {lang.use('settings_notifications_volume')}
              </span>
              <input
                class="SettingsModal__volumeSlider"
                type="range"
                min="0"
                max="100"
                value={Math.round(settings.notificationVolume * 100)}
                onInput={(event) => {
                  settings.notificationVolume = Number(event.target.value) / 100
                }}
              />
              <Button
                mode="secondary"
                size="small"
                onClick={() => {
                  playNotificationSound(settings.notificationSoundId, settings.notificationVolume)
                }}
              >
                {lang.use('settings_notifications_play')}
              </Button>
            </div>
          </>
        )}
      </div>

      <div class="SettingsModal__section">
        <span class="SettingsModal__sectionTitle">{lang.use('settings_section_privacy')}</span>

        <Checkbox
          label={lang.use('settings_keep_deleted')}
          checked={settings.keepDeletedMessages}
          onChange={(checked) => (settings.keepDeletedMessages = checked)}
        />

        <Checkbox
          label={lang.use('settings_keep_edits')}
          checked={settings.keepEditHistory}
          onChange={(checked) => (settings.keepEditHistory = checked)}
        />

        <Checkbox
          label={lang.use('settings_stealth_read')}
          checked={settings.stealthRead}
          onChange={(checked) => (settings.stealthRead = checked)}
        />

        {settings.stealthRead && (
          <div class="SettingsModal__hint">{lang.use('settings_stealth_read_hint')}</div>
        )}

        {(settings.keepDeletedMessages || settings.keepEditHistory) && (
          <div class="SettingsModal__warning">{lang.use('settings_intercept_warning')}</div>
        )}

        <Button mode="secondary" size="small" onClick={() => journalModal.open({})}>
          {lang.use('settings_journal_open')}
          {journal.entries.length > 0 && (
            ` · ${lang.usePlural('settings_journal_count', journal.entries.length)}`
          )}
        </Button>
      </div>

      {USAGE_COUNTER_ENDPOINT && (
        <div class="SettingsModal__section">
          <span class="SettingsModal__sectionTitle">{lang.use('settings_section_usage')}</span>

          {/*
            Раскрытие видно всем, кто пользуется сборкой: скрывать отправку
            от людей, которым раздали приложение, было бы нечестно
          */}
          <div class="SettingsModal__hint">{lang.use('settings_usage_disclosure')}</div>

          {isCounterOwner && (
            <div class="SettingsModal__counters">
              <div class="SettingsModal__counter">
                <span class="SettingsModal__counterValue">{usage.users || '—'}</span>
                <span class="SettingsModal__counterLabel">
                  {lang.use('settings_usage_users')}
                </span>
              </div>
              <div class="SettingsModal__counter">
                <span class="SettingsModal__counterValue">{usage.logins || '—'}</span>
                <span class="SettingsModal__counterLabel">
                  {lang.use('settings_usage_logins')}
                </span>
              </div>
            </div>
          )}

          {isCounterOwner && usage.status === 'error' && (
            <div class="SettingsModal__hint">{lang.use('settings_usage_error')}</div>
          )}
        </div>
      )}

      <div class="SettingsModal__section">
        <span class="SettingsModal__sectionTitle">{lang.use('settings_section_window')}</span>

        <Checkbox
          label={lang.use('settings_alwaysOnTop_description')}
          checked={mainSettings.alwaysOnTop}
          onChange={(checked) => {
            mainSettings.alwaysOnTop = checked
            changeWindowSettingModal.open()
          }}
        />

        <Checkbox
          label={lang.use('settings_useCustomTitlebar_description')}
          checked={mainSettings.useCustomTitlebar}
          onChange={(checked) => {
            mainSettings.useCustomTitlebar = checked
            changeWindowSettingModal.open()
          }}
        />

        {!isMacOS && (
          <>
            <Checkbox
              label={lang.use('settings_close_to_tray')}
              checked={mainSettings.closeToTray}
              onChange={(checked) => {
                mainSettings.closeToTray = checked
                // Решение по крестику принимает main процесс, ему и сообщаем
                electronBridge.app.setCloseToTray(checked)
              }}
            />

            {mainSettings.closeToTray && (
              <div class="SettingsModal__hint">{lang.use('settings_close_to_tray_hint')}</div>
            )}

            <Button
              mode="secondary"
              size="small"
              onClick={() => electronBridge.app.quit()}
            >
              {lang.use('settings_quit')}
            </Button>
          </>
        )}
      </div>

      <Modal
        opened={changeWindowSettingModal.opened}
        onClose={changeWindowSettingModal.close}
        title={lang.use('settings_changeWindowSetting_title')}
        buttons={
          <Button onClick={changeWindowSettingModal.close}>
            {lang.use('modal_close_label')}
          </Button>
        }
      >
        {lang.use('settings_changeWindowSetting_description')}
      </Modal>
    </Modal>
  )
})

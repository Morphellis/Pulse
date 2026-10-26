import { defineComponent } from 'vue'
import { useServices } from 'services'
import * as Attach from 'model/Attach'
import { Link } from 'ui/ui/Link/Link'
import { Icon24DownloadOutline } from 'assets/icons'
import './AttachDoc.css'

type Props = {
  doc: Attach.Doc
}

export const AttachDoc = defineComponent<Props>((props) => {
  const { lang } = useServices()

  return () => {
    const { doc } = props

    return (
      <Link class="AttachDoc" href={doc.url} title={doc.title}>
        <span class="AttachDoc__ext">{doc.ext.slice(0, 4)}</span>

        <span class="AttachDoc__info">
          <span class="AttachDoc__title">{doc.title}</span>
          <span class="AttachDoc__meta">
            {formatSize(doc.size)}
            {doc.isUnsafe && (
              <span class="AttachDoc__unsafe">{lang.use('me_attach_doc_unsafe')}</span>
            )}
          </span>
        </span>

        <Icon24DownloadOutline
          width="20"
          class="AttachDoc__download"
          color="var(--vkui--color_icon_secondary)"
        />
      </Link>
    )
  }
}, {
  props: ['doc']
})

/** Килобайты и мегабайты по 1024, как показывает сам ВК */
function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} Б`
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} КБ`
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`
}

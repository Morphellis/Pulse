import { defineComponent, watch } from 'vue'
import { useServices } from 'services'
import * as Post from 'model/Post'
import { FEED_MODES, FeedMode, useNewsfeedStore } from 'store/newsfeed'
import { loadMoreNewsfeed, refreshNewsfeed } from 'actions'
import { FeedPost } from 'ui/feed/FeedPost/FeedPost'
import { PostSkeleton } from 'ui/feed/PostSkeleton/PostSkeleton'
import { ButtonIcon } from 'ui/ui/ButtonIcon/ButtonIcon'
import { IntersectionWrapper } from 'ui/ui/IntersectionWrapper/IntersectionWrapper'
import { LoadError } from 'ui/ui/LoadError/LoadError'
import { Spinner } from 'ui/ui/Spinner/Spinner'
import { Tabs } from 'ui/ui/Tabs/Tabs'
import { TabsItem } from 'ui/ui/TabsItem/TabsItem'
import { Icon24RefreshOutline } from 'assets/icons'
import './Feed.css'

export const Feed = defineComponent(() => {
  const { lang } = useServices()
  const newsfeed = useNewsfeedStore()

  const modeLabel = (mode: FeedMode) => {
    switch (mode) {
      case 'interesting':
        return lang.use('feed_mode_interesting')
      case 'recent':
        return lang.use('feed_mode_recent')
      case 'discover':
        return lang.use('feed_mode_discover')
    }
  }

  const selectMode = (mode: FeedMode) => {
    newsfeed.mode = mode
  }

  /*
    Загружаем ленту явно, а не полагаясь только на появление спиннера в зоне
    видимости: при переключении режима список пересоздаётся, и момент срабатывания
    наблюдателя оказывается непредсказуемым
  */
  watch(() => newsfeed.mode, (mode) => {
    const feed = newsfeed.feeds[mode]

    if (feed.posts.length === 0 && feed.status === 'hasMore') {
      loadMoreNewsfeed(mode)
    }
  }, { immediate: true })

  return () => {
    const { feed } = newsfeed

    return (
      <div class="Feed">
        <div class="Feed__header">
          <Tabs class="Feed__modes">
            {FEED_MODES.map((mode) => (
              <TabsItem
                key={mode}
                active={newsfeed.mode === mode}
                onClick={() => selectMode(mode)}
              >
                {modeLabel(mode)}
              </TabsItem>
            ))}
          </Tabs>

          <ButtonIcon
            class="Feed__refresh"
            onClick={() => refreshNewsfeed()}
            disabled={feed.status === 'loading'}
            title={lang.use('feed_refresh')}
            icon={<Icon24RefreshOutline color="var(--vkui--color_icon_secondary)" />}
            withHoverBackground
          />
        </div>

        {newsfeed.mode === 'discover' && feed.posts.length > 0 && (
          <div class="Feed__note">{lang.use('feed_discover_note')}</div>
        )}

        <div class="Feed__list" key={newsfeed.mode}>
          {feed.posts.map((post) => (
            <FeedPost key={Post.key(post)} post={post} />
          ))}

          {feed.posts.length === 0 && feed.status === 'complete' && (
            <div class="Feed__placeholder">{lang.use('feed_empty')}</div>
          )}

          {feed.posts.length > 0 && feed.status === 'complete' && (
            <div class="Feed__placeholder">{lang.use('feed_end')}</div>
          )}

          {feed.status === 'error' && <LoadError onRetry={() => loadMoreNewsfeed()} />}

          {(feed.status === 'loading' || feed.status === 'hasMore') && (
            <IntersectionWrapper
              onIntersect={() => loadMoreNewsfeed()}
              key={feed.posts.length}
            >
              {/*
                На первой загрузке показываем заглушки в форме постов, дальше - спиннер:
                скелетон на месте уже прочитанной ленты выглядел бы как сброс
              */}
              {feed.posts.length === 0
                ? <PostSkeleton count={3} />
                : <Spinner size="regular" class="Feed__spinner" />}
            </IntersectionWrapper>
          )}
        </div>
      </div>
    )
  }
})

import { useServices } from 'services'
import * as Peer from 'model/Peer'
import * as Post from 'model/Post'
import { useWallStore } from 'store/wall'
import { insertPeers } from 'actions'
import { fromApiWallPost } from 'converters/PostConverter'
import { PEER_FIELDS, WALL_PER_PAGE } from 'misc/constants'

export async function loadMoreWall(ownerId: Peer.OwnerId) {
  const { api } = useServices()
  const wallStore = useWallStore()
  const wall = wallStore.getWall(ownerId)

  if (wall.status === 'loading' || wall.status === 'complete') {
    return
  }

  try {
    wall.status = 'loading'

    const response = await api.fetch('wall.get', {
      owner_id: ownerId,
      offset: wall.offset,
      count: WALL_PER_PAGE,
      extended: 1,
      fields: PEER_FIELDS
    })

    insertPeers({
      profiles: response.profiles,
      groups: response.groups
    })

    for (const apiPost of response.items) {
      const post = fromApiWallPost(apiPost)

      if (!post) {
        continue
      }

      const key = Post.key(post)

      // Закрепленная запись приходит первой на каждой странице
      if (wall.postKeys.has(key)) {
        continue
      }

      wall.postKeys.add(key)
      wall.posts.push(post)
    }

    wall.offset += response.items.length
    wall.totalCount = response.count
    wall.status = response.items.length < WALL_PER_PAGE ? 'complete' : 'hasMore'
  } catch (err) {
    console.warn('[loadMoreWall] loading error', err)
    wall.status = 'error'
  }
}

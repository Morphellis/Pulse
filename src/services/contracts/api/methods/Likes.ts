// likes.add
export type LikesAddParams = {
  type: 'post' | 'comment' | 'photo' | 'video'
  owner_id: number
  item_id: number
  access_key?: string
}

export type LikesAddResponse = {
  likes: number
}

// likes.delete
export type LikesDeleteParams = LikesAddParams

export type LikesDeleteResponse = {
  likes: number
}

// likes.getList
export type LikesGetListParams = {
  type: 'post' | 'comment' | 'photo' | 'video' | 'photo_comment' | 'video_comment' | 'topic_comment'
  owner_id: number
  item_id: number
  offset?: number
  /** Максимум 1000 */
  count?: number
  filter?: 'likes' | 'copies'
}

export type LikesGetListResponse = {
  count: number
  items: number[]
}

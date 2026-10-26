import {
  AccountBanParams,
  AccountBanResponse,
  AccountSetSilenceModeParams,
  AccountSetSilenceModeResponse,
  AccountUnbanParams,
  AccountUnbanResponse
} from 'services/contracts/api/methods/Account'
import {
  AuthCheckAuthCodeParams,
  AuthCheckAuthCodeResponse,
  AuthExchangeSilentAuthTokenParams,
  AuthExchangeSilentAuthTokenResponse,
  AuthGetAnonymTokenParams,
  AuthGetAnonymTokenResponse,
  AuthGetAuthCodeParams,
  AuthGetAuthCodeResponse,
  AuthGetExchangeTokenParams,
  AuthGetExchangeTokenResponse,
  AuthGetOauthTokenParams,
  AuthGetOauthTokenResponse,
  AuthProcessAuthCodeParams,
  AuthProcessAuthCodeResponse,
  AuthValidateAccountParams,
  AuthValidateAccountResponse,
  AuthValidatePhoneParams,
  AuthValidatePhoneResponse
} from 'services/contracts/api/methods/Auth'
import { CaptchaForceParams, CaptchaForceResponse } from 'services/contracts/api/methods/Captcha'
import {
  DocsGetMessagesUploadServerParams,
  DocsGetMessagesUploadServerResponse,
  DocsSaveParams,
  DocsSaveResponse
} from 'services/contracts/api/methods/Docs'
import {
  FriendsGetMutualParams,
  FriendsGetMutualResponse,
  FriendsGetParams,
  FriendsGetResponse
} from 'services/contracts/api/methods/Friends'
import {
  GroupsGetByIdParams,
  GroupsGetByIdResponse,
  GroupsGetParams,
  GroupsGetResponse
} from 'services/contracts/api/methods/Groups'
import {
  LikesAddParams,
  LikesAddResponse,
  LikesDeleteParams,
  LikesDeleteResponse,
  LikesGetListParams,
  LikesGetListResponse
} from 'services/contracts/api/methods/Likes'
import {
  MessagesArchiveConversationParams,
  MessagesArchiveConversationResponse,
  MessagesDeleteConversationParams,
  MessagesDeleteConversationResponse,
  MessagesDeleteParams,
  MessagesDeleteReactionParams,
  MessagesDeleteReactionResponse,
  MessagesDeleteResponse,
  MessagesEditParams,
  MessagesEditResponse,
  MessagesGetByConversationMessageIdParams,
  MessagesGetByConversationMessageIdResponse,
  MessagesGetConversationsByIdParams,
  MessagesGetConversationsByIdResponse,
  MessagesGetConversationsParams,
  MessagesGetConversationsResponse,
  MessagesGetDiffContentParams,
  MessagesGetDiffContentResponse,
  MessagesGetDiffParams,
  MessagesGetDiffResponse,
  MessagesGetHistoryParams,
  MessagesGetHistoryResponse,
  MessagesGetLongPollHistoryParams,
  MessagesGetLongPollHistoryResponse,
  MessagesGetLongPollServerParams,
  MessagesGetLongPollServerResponse,
  MessagesGetReactedPeersParams,
  MessagesGetReactedPeersResponse,
  MessagesGetReactionsAssetsParams,
  MessagesGetReactionsAssetsResponse,
  MessagesGetRecentStickersParams,
  MessagesGetRecentStickersResponse,
  MessagesMarkAsImportantParams,
  MessagesMarkAsImportantResponse,
  MessagesMarkAsPlayedParams,
  MessagesMarkAsPlayedResponse,
  MessagesMarkAsReadParams,
  MessagesMarkAsReadResponse,
  MessagesMarkAsUnreadParams,
  MessagesMarkAsUnreadResponse,
  MessagesPinConversationParams,
  MessagesPinConversationResponse,
  MessagesSendParams,
  MessagesSendReactionParams,
  MessagesSendReactionResponse,
  MessagesSendResponse,
  MessagesUnarchiveConversationParams,
  MessagesUnarchiveConversationResponse,
  MessagesUnpinConversationParams,
  MessagesUnpinConversationResponse
} from 'services/contracts/api/methods/Messages'
import {
  NewsfeedGetParams,
  NewsfeedGetResponse,
  NewsfeedSearchParams,
  NewsfeedSearchResponse
} from 'services/contracts/api/methods/Newsfeed'
import {
  PhotosGetMessagesUploadServerParams,
  PhotosGetMessagesUploadServerResponse,
  PhotosSaveMessagesPhotoParams,
  PhotosSaveMessagesPhotoResponse
} from 'services/contracts/api/methods/Photos'
import { StatsTrackVisitorParams, StatsTrackVisitorResponse } from 'services/contracts/api/methods/Stats'
import {
  StoreGetFavoriteStickersParams,
  StoreGetFavoriteStickersResponse,
  StoreGetProductsParams,
  StoreGetProductsResponse,
  StoreGetStickersKeywordsParams,
  StoreGetStickersKeywordsResponse
} from 'services/contracts/api/methods/Store'
import {
  UsersGetFollowersParams,
  UsersGetFollowersResponse,
  UsersGetParams,
  UsersGetResponse,
  UsersGetSubscriptionsParams,
  UsersGetSubscriptionsResponse,
  UsersSearchParams,
  UsersSearchResponse
} from 'services/contracts/api/methods/Users'
import {
  UtilsResolveScreenNameParams,
  UtilsResolveScreenNameResponse
} from 'services/contracts/api/methods/Utils'
import { VideoGetParams, VideoGetResponse } from 'services/contracts/api/methods/Video'
import {
  WallCreateCommentParams,
  WallCreateCommentResponse,
  WallGetCommentsParams,
  WallGetCommentsResponse,
  WallGetParams,
  WallGetResponse,
  WallRepostParams,
  WallRepostResponse
} from 'services/contracts/api/methods/Wall'

/**
 * Disclaimer:
 * Здесь описана только та часть типов, которая необходима для приложения.
 * То есть приходящие объекты могут содержать больше полей, чем описано (но не меньше)
 */

export type CommonParams = {
  v?: string
  access_token?: string
  lang?: string
  captcha_sid?: string
  captcha_key?: string
}

export type Methods = {
  execute: {
    params: { code: string }
    response: unknown
  }

  'auth.validatePhone': {
    params: AuthValidatePhoneParams
    response: AuthValidatePhoneResponse
  }
  'auth.getOauthToken': {
    params: AuthGetOauthTokenParams
    response: AuthGetOauthTokenResponse
  }
  'auth.getAnonymToken': {
    params: AuthGetAnonymTokenParams
    response: AuthGetAnonymTokenResponse
  }
  'auth.getAuthCode': {
    params: AuthGetAuthCodeParams
    response: AuthGetAuthCodeResponse
  }
  'auth.checkAuthCode': {
    params: AuthCheckAuthCodeParams
    response: AuthCheckAuthCodeResponse
  }
  'auth.validateAccount': {
    params: AuthValidateAccountParams
    response: AuthValidateAccountResponse
  }
  'auth.processAuthCode': {
    params: AuthProcessAuthCodeParams
    response: AuthProcessAuthCodeResponse
  }
  'auth.exchangeSilentAuthToken': {
    params: AuthExchangeSilentAuthTokenParams
    response: AuthExchangeSilentAuthTokenResponse
  }
  'auth.getExchangeToken': {
    params: AuthGetExchangeTokenParams
    response: AuthGetExchangeTokenResponse
  }

  'captcha.force': {
    params: CaptchaForceParams
    response: CaptchaForceResponse
  }

  'account.setSilenceMode': {
    params: AccountSetSilenceModeParams
    response: AccountSetSilenceModeResponse
  }
  'account.ban': {
    params: AccountBanParams
    response: AccountBanResponse
  }
  'account.unban': {
    params: AccountUnbanParams
    response: AccountUnbanResponse
  }

  'docs.getMessagesUploadServer': {
    params: DocsGetMessagesUploadServerParams
    response: DocsGetMessagesUploadServerResponse
  }
  'docs.save': {
    params: DocsSaveParams
    response: DocsSaveResponse
  }

  'friends.get': {
    params: FriendsGetParams
    response: FriendsGetResponse
  }
  'friends.getMutual': {
    params: FriendsGetMutualParams
    response: FriendsGetMutualResponse
  }

  'groups.getById': {
    params: GroupsGetByIdParams
    response: GroupsGetByIdResponse
  }
  'groups.get': {
    params: GroupsGetParams
    response: GroupsGetResponse
  }

  'messages.getConversations': {
    params: MessagesGetConversationsParams
    response: MessagesGetConversationsResponse
  }
  'messages.getConversationsById': {
    params: MessagesGetConversationsByIdParams
    response: MessagesGetConversationsByIdResponse
  }
  'messages.getHistory': {
    params: MessagesGetHistoryParams
    response: MessagesGetHistoryResponse
  }
  'messages.getByConversationMessageId': {
    params: MessagesGetByConversationMessageIdParams
    response: MessagesGetByConversationMessageIdResponse
  }
  'messages.getLongPollServer': {
    params: MessagesGetLongPollServerParams
    response: MessagesGetLongPollServerResponse
  }
  'messages.getLongPollHistory': {
    params: MessagesGetLongPollHistoryParams
    response: MessagesGetLongPollHistoryResponse
  }
  'messages.delete': {
    params: MessagesDeleteParams
    response: MessagesDeleteResponse
  }
  'messages.edit': {
    params: MessagesEditParams
    response: MessagesEditResponse
  }
  'messages.send': {
    params: MessagesSendParams
    response: MessagesSendResponse
  }
  'messages.markAsPlayed': {
    params: MessagesMarkAsPlayedParams
    response: MessagesMarkAsPlayedResponse
  }
  'messages.markAsRead': {
    params: MessagesMarkAsReadParams
    response: MessagesMarkAsReadResponse
  }
  'messages.markAsImportant': {
    params: MessagesMarkAsImportantParams
    response: MessagesMarkAsImportantResponse
  }
  'messages.markAsUnread': {
    params: MessagesMarkAsUnreadParams
    response: MessagesMarkAsUnreadResponse
  }
  'messages.deleteConversation': {
    params: MessagesDeleteConversationParams
    response: MessagesDeleteConversationResponse
  }
  'messages.archiveConversation': {
    params: MessagesArchiveConversationParams
    response: MessagesArchiveConversationResponse
  }
  'messages.unarchiveConversation': {
    params: MessagesUnarchiveConversationParams
    response: MessagesUnarchiveConversationResponse
  }
  'messages.pinConversation': {
    params: MessagesPinConversationParams
    response: MessagesPinConversationResponse
  }
  'messages.unpinConversation': {
    params: MessagesUnpinConversationParams
    response: MessagesUnpinConversationResponse
  }
  'messages.getReactionsAssets': {
    params: MessagesGetReactionsAssetsParams
    response: MessagesGetReactionsAssetsResponse
  }
  'messages.sendReaction': {
    params: MessagesSendReactionParams
    response: MessagesSendReactionResponse
  }
  'messages.deleteReaction': {
    params: MessagesDeleteReactionParams
    response: MessagesDeleteReactionResponse
  }
  'messages.getReactedPeers': {
    params: MessagesGetReactedPeersParams
    response: MessagesGetReactedPeersResponse
  }
  'messages.getRecentStickers': {
    params: MessagesGetRecentStickersParams
    response: MessagesGetRecentStickersResponse
  }
  'messages.getDiffContent': {
    params: MessagesGetDiffContentParams
    response: MessagesGetDiffContentResponse
  }
  'messages.getDiff': {
    params: MessagesGetDiffParams
    response: MessagesGetDiffResponse
  }

  'newsfeed.get': {
    params: NewsfeedGetParams
    response: NewsfeedGetResponse
  }
  'newsfeed.search': {
    params: NewsfeedSearchParams
    response: NewsfeedSearchResponse
  }

  'users.get': {
    params: UsersGetParams
    response: UsersGetResponse
  }
  'users.search': {
    params: UsersSearchParams
    response: UsersSearchResponse
  }
  'users.getFollowers': {
    params: UsersGetFollowersParams
    response: UsersGetFollowersResponse
  }
  'users.getSubscriptions': {
    params: UsersGetSubscriptionsParams
    response: UsersGetSubscriptionsResponse
  }

  'utils.resolveScreenName': {
    params: UtilsResolveScreenNameParams
    response: UtilsResolveScreenNameResponse
  }

  'video.get': {
    params: VideoGetParams
    response: VideoGetResponse
  }

  'photos.getMessagesUploadServer': {
    params: PhotosGetMessagesUploadServerParams
    response: PhotosGetMessagesUploadServerResponse
  }
  'photos.saveMessagesPhoto': {
    params: PhotosSaveMessagesPhotoParams
    response: PhotosSaveMessagesPhotoResponse
  }

  'stats.trackVisitor': {
    params: StatsTrackVisitorParams
    response: StatsTrackVisitorResponse
  }

  'store.getProducts': {
    params: StoreGetProductsParams
    response: StoreGetProductsResponse
  }
  'store.getFavoriteStickers': {
    params: StoreGetFavoriteStickersParams
    response: StoreGetFavoriteStickersResponse
  }
  'store.getStickersKeywords': {
    params: StoreGetStickersKeywordsParams
    response: StoreGetStickersKeywordsResponse
  }

  'likes.add': {
    params: LikesAddParams
    response: LikesAddResponse
  }
  'likes.delete': {
    params: LikesDeleteParams
    response: LikesDeleteResponse
  }
  'likes.getList': {
    params: LikesGetListParams
    response: LikesGetListResponse
  }

  'wall.get': {
    params: WallGetParams
    response: WallGetResponse
  }
  'wall.getComments': {
    params: WallGetCommentsParams
    response: WallGetCommentsResponse
  }
  'wall.createComment': {
    params: WallCreateCommentParams
    response: WallCreateCommentResponse
  }
  'wall.repost': {
    params: WallRepostParams
    response: WallRepostResponse
  }
}

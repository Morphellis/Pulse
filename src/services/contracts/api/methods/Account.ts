// account.setSilenceMode
export type AccountSetSilenceModeParams = {
  time: number
  peer_id: number
  sound: number
}

export type AccountSetSilenceModeResponse = 1

// account.ban
export type AccountBanParams = {
  owner_id: number
}

export type AccountBanResponse = 1

// account.unban
export type AccountUnbanParams = {
  owner_id: number
}

export type AccountUnbanResponse = 1

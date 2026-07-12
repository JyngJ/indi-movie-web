export const USER_REQUEST_KINDS = ['movie', 'theater', 'director', 'etc'] as const

export type UserRequestKind = typeof USER_REQUEST_KINDS[number]
export type UserRequestStatus = 'pending' | 'saved' | 'deleted'

export interface CreateUserRequestInput {
  kind: UserRequestKind
  name: string
  note?: string
  query?: string
}

export interface UserRequestRecord extends CreateUserRequestInput {
  id: string
  status: UserRequestStatus
  discordMessageId?: string | null
  createdAt: string
  updatedAt: string
}

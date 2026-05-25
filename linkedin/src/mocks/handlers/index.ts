import { authHandlers } from './auth'
import { companyHandlers } from './companies'
import { feedHandlers } from './feed'
import { groupHandlers } from './groups'
import { jobHandlers } from './jobs'
import { learningHandlers } from './learning'
import { messageHandlers } from './messages'
import { networkHandlers } from './network'
import { notificationHandlers } from './notifications'
import { searchHandlers } from './search'
import { settingsHandlers } from './settings'
import { userHandlers } from './users'

export const handlers = [
  ...authHandlers,
  ...feedHandlers,
  ...userHandlers,
  ...networkHandlers,
  ...searchHandlers,
  ...jobHandlers,
  ...messageHandlers,
  ...notificationHandlers,
  ...companyHandlers,
  ...groupHandlers,
  ...learningHandlers,
  ...settingsHandlers,
]

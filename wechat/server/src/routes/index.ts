import { Router } from 'express'
import { authRouter } from './auth.js'
import { messagesRouter } from './messages.js'
import { momentsRouter } from './moments.js'
import { channelsRouter } from './channels.js'
import { contactsRouter } from './contacts.js'
import { usersRouter } from './users.js'
import { groupsRouter } from './groups.js'
import { searchRouter } from './search.js'
import { notificationsRouter } from './notifications.js'
import { pagesRouter } from './pages.js'
import { feedbackRouter } from './feedback.js'
import { settingsRouter } from './settings.js'
import { reportsRouter } from './reports.js'
import { eventsRouter } from './events.js'

export const apiRouter = Router()

apiRouter.use('/auth', authRouter)
apiRouter.use('/messages', messagesRouter)
apiRouter.use('/moments', momentsRouter)
apiRouter.use('/channels', channelsRouter)
apiRouter.use('/contacts', contactsRouter)
apiRouter.use('/users', usersRouter)
apiRouter.use('/groups', groupsRouter)
apiRouter.use('/search', searchRouter)
apiRouter.use('/notifications', notificationsRouter)
apiRouter.use('/pages', pagesRouter)
apiRouter.use('/feedback', feedbackRouter)
apiRouter.use('/settings', settingsRouter)
apiRouter.use('/reports', reportsRouter)
apiRouter.use('/events', eventsRouter)

import { Router } from 'express'
import { authRouter } from './auth.js'
import { serversRouter } from './servers.js'
import { channelsRouter } from './channels.js'
import { postsRouter } from './posts.js'
import { usersRouter } from './users.js'
import { groupsRouter } from './groups.js'
import { messagesRouter } from './messages.js'
import { searchRouter } from './search.js'
import { notificationsRouter } from './notifications.js'
import { pagesRouter } from './pages.js'
import { feedbackRouter } from './feedback.js'
import { settingsRouter } from './settings.js'
import { reportsRouter } from './reports.js'
import { eventsRouter } from './events.js'

export const apiRouter = Router()

apiRouter.use('/auth', authRouter)
apiRouter.use('/servers', serversRouter)
apiRouter.use('/channels', channelsRouter)
apiRouter.use('/posts', postsRouter)
apiRouter.use('/users', usersRouter)
apiRouter.use('/groups', groupsRouter)
apiRouter.use('/messages', messagesRouter)
apiRouter.use('/search', searchRouter)
apiRouter.use('/notifications', notificationsRouter)
apiRouter.use('/pages', pagesRouter)
apiRouter.use('/feedback', feedbackRouter)
apiRouter.use('/settings', settingsRouter)
apiRouter.use('/reports', reportsRouter)
apiRouter.use('/events', eventsRouter)

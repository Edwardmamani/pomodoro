const ElectronMock = require('./smoke/ElectronMock')
ElectronMock.install()

const { runMigrations } = require('../electron-main/db/migrations')
const { runSeed } = require('../electron-main/db/seed')
const { closeConnection } = require('../electron-main/db/connection')
const timer = require('../electron-main/controllers/TimerController')
const TaskSmokeSuite = require('./smoke/TaskSmokeSuite')
const TimerNotesSmokeSuite = require('./smoke/TimerNotesSmokeSuite')
const RoutineSmokeSuite = require('./smoke/RoutineSmokeSuite')
const MusicSmokeSuite = require('./smoke/MusicSmokeSuite')

class SmokeTestRunner {
  async run() {
    runMigrations()
    runSeed()
    timer.init()

    const activeTask = new TaskSmokeSuite().run()
    await new TimerNotesSmokeSuite().run(activeTask)
    await new RoutineSmokeSuite().run()
    await new MusicSmokeSuite().run()

    closeConnection()
    console.log('✅ Smoke tests pasaron exitosamente (Cronómetro + Priorización Vectorial + Rutinas + Música YouTube/Spotify + DB)')
  }
}

new SmokeTestRunner().run().catch((err) => {
  console.error('❌ Falló smoke test:', err)
  process.exit(1)
})

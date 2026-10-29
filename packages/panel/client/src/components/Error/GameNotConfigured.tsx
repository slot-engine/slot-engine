export const GameNotConfigured = () => {
  return (
    <div className="max-w-xl px-4 py-3 rounded-xl bg-danger-950 text-ui-100">
      Uh-oh! <b className="text-danger-500">This game is not properly configured</b>.
      Please make sure you have configured <code>rootDir: __dirname</code> when calling{" "}
      <code>createSlotGame()</code>.
    </div>
  )
}

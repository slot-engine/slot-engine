export const GameNotConfigured = () => {
  return (
    <div className="max-w-xl p-2 bg-red-700 rounded-sm">
      Uh-oh! <b>This game is not properly configured</b>. Please make sure you have
      configured <code>rootDir: __dirname</code> when calling{" "}
      <code>createSlotGame()</code>.
    </div>
  )
}

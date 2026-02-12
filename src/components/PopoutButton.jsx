import { useGame } from '../context/GameContext';

export default function PopoutButton() {
  const { state } = useGame();

  const handlePopout = () => {
    const params = state.gameId ? `?gameId=${state.gameId}` : '';
    window.open(
      `/popup.html${params}`,
      'chess-coach',
      'width=420,height=860'
    );
  };

  return (
    <button
      className="header-btn popout-btn"
      onClick={handlePopout}
      title="Open in full window"
    >
      &#8599;
    </button>
  );
}

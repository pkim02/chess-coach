import { evalBarPercent, evalToText } from '../utils/chess';
import './EvalBar.css';

export default function EvalBar({ evaluation, flipped = false }) {
  const whitePercent = evalBarPercent(evaluation);
  const displayText = evalToText(evaluation);
  const isWhiteAdvantage = whitePercent >= 50;

  return (
    <div className={`eval-bar ${flipped ? 'flipped' : ''}`}>
      <div className="eval-bar-inner">
        <div
          className="eval-bar-white"
          style={{ height: `${flipped ? 100 - whitePercent : whitePercent}%` }}
        />
        <div
          className="eval-bar-black"
          style={{ height: `${flipped ? whitePercent : 100 - whitePercent}%` }}
        />
      </div>
      <div className={`eval-bar-label ${isWhiteAdvantage ? 'white-adv' : 'black-adv'}`}>
        {displayText}
      </div>
    </div>
  );
}

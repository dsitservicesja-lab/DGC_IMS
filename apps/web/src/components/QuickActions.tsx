type Props = {
  onRefresh: () => void;
};

export function QuickActions({ onRefresh }: Props) {
  return (
    <section className="quick-actions">
      <button className="action action-primary" type="button">
        New Requisition
      </button>
      <button className="action" type="button">
        Receive Goods
      </button>
      <button className="action" type="button">
        Issue Stock
      </button>
      <button className="action" type="button">
        Start Cycle Count
      </button>
      <button className="action action-secondary" type="button" onClick={onRefresh}>
        Refresh Dashboard
      </button>
    </section>
  );
}

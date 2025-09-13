import { HEALTH_BENEFIT_CHOICES } from '../constants/health-benefits';

export function pick3HealthBenefits(): string[] {
  const arr = [...HEALTH_BENEFIT_CHOICES];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, 3);
}
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NavBar } from "@/components/nav-bar";

let mockPathname = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

afterEach(() => {
  cleanup();
  mockPathname = "/";
});

describe("NavBar", () => {
  it("renders primary nav links (Dashboard, Analytics, Recoverables) and a More trigger on desktop", () => {
    render(<NavBar />);

    expect(screen.getAllByText("Dashboard").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Analytics").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Recoverables").length).toBeGreaterThanOrEqual(
      1
    );
    expect(screen.getByText("More")).toBeInTheDocument();
  });

  it("renders desktop primary links with correct hrefs", () => {
    render(<NavBar />);

    const dashboardLink = screen.getAllByText("Dashboard")[0].closest("a");
    const analyticsLink = screen.getAllByText("Analytics")[0].closest("a");
    const recoverablesLink = screen
      .getAllByText("Recoverables")[0]
      .closest("a");

    expect(dashboardLink).toHaveAttribute("href", "/");
    expect(analyticsLink).toHaveAttribute("href", "/analytics");
    expect(recoverablesLink).toHaveAttribute("href", "/recoverables");
  });

  it("reveals secondary items (Categories, Import, Debug) when the More menu is opened", async () => {
    const user = userEvent.setup();
    render(<NavBar />);

    await user.click(screen.getByText("More"));

    expect(await screen.findByText("Categories")).toBeInTheDocument();
    expect(screen.getByText("Import")).toBeInTheDocument();
    expect(screen.getByText("Debug")).toBeInTheDocument();
  });

  it("highlights Dashboard when on root path", () => {
    mockPathname = "/";
    render(<NavBar />);

    const dashboardLink = screen.getAllByText("Dashboard")[0].closest("a");
    const analyticsLink = screen.getAllByText("Analytics")[0].closest("a");

    expect(dashboardLink?.className).toContain("bg-primary");
    expect(analyticsLink?.className).not.toContain("bg-primary");
  });

  it("highlights Analytics when on /analytics path", () => {
    mockPathname = "/analytics";
    render(<NavBar />);

    const dashboardLink = screen.getAllByText("Dashboard")[0].closest("a");
    const analyticsLink = screen.getAllByText("Analytics")[0].closest("a");

    expect(dashboardLink?.className).not.toContain("bg-primary");
    expect(analyticsLink?.className).toContain("bg-primary");
  });

  it("highlights Analytics for nested analytics paths", () => {
    mockPathname = "/analytics/history";
    render(<NavBar />);

    const analyticsLink = screen.getAllByText("Analytics")[0].closest("a");
    expect(analyticsLink?.className).toContain("bg-primary");
  });

  it("highlights the More trigger when on a secondary route", () => {
    mockPathname = "/categories/manage";
    render(<NavBar />);

    const moreTrigger = screen.getByText("More").closest("button");
    expect(moreTrigger?.className).toContain("bg-primary");
  });

  it("renders a mobile menu button", () => {
    render(<NavBar />);
    expect(screen.getByLabelText("Open menu")).toBeInTheDocument();
  });
});

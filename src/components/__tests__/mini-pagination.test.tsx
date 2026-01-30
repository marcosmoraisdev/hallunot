/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"
import { MiniPagination } from "../mini-pagination"

describe("MiniPagination", () => {
  it("renders page info and navigation buttons", () => {
    render(
      <MiniPagination page={1} totalPages={5} onPageChange={() => {}} />
    )

    expect(screen.getByText("1 / 5")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /previous/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument()
  })

  it("disables previous button on first page", () => {
    render(
      <MiniPagination page={1} totalPages={5} onPageChange={() => {}} />
    )

    expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled()
    expect(screen.getByRole("button", { name: /next/i })).not.toBeDisabled()
  })

  it("disables next button on last page", () => {
    render(
      <MiniPagination page={5} totalPages={5} onPageChange={() => {}} />
    )

    expect(screen.getByRole("button", { name: /previous/i })).not.toBeDisabled()
    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled()
  })

  it("calls onPageChange with correct page when clicking buttons", () => {
    const handlePageChange = vi.fn()
    render(
      <MiniPagination page={3} totalPages={5} onPageChange={handlePageChange} />
    )

    fireEvent.click(screen.getByRole("button", { name: /previous/i }))
    expect(handlePageChange).toHaveBeenCalledWith(2)

    fireEvent.click(screen.getByRole("button", { name: /next/i }))
    expect(handlePageChange).toHaveBeenCalledWith(4)
  })

  it("returns null when totalPages is 1 or less", () => {
    const { container } = render(
      <MiniPagination page={1} totalPages={1} onPageChange={() => {}} />
    )

    expect(container.firstChild).toBeNull()
  })
})

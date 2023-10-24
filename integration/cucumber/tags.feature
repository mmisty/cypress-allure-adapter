@release1.1
@parentSuite("Other")
Feature: duckduckgo.com
  Background:
    Given I visit site

    @P1
    @story("Cucumber")
    #@issue("ABC-454")
    @issue('ABC-455','issue_link_description')
    @issue("ABC-456","issue_link_description")
    #@tms("ABC-124")
    @tms("ABC-123","tms_link_description")
    @link("example","https://example.com")
    @severity("minor")
  Scenario: 01 should have tag
    Then I should see a search bar "test with tag"

  Scenario Outline: 02 with examples
    Then I should see a search bar "<text>"
    @simple
    Examples:
      | text  |
      | hello |

    @complex
    Examples:
      | text  |
      | bye   |
@release1.1
Feature: duckduckgo.com
  Background:
    Given I visit site

    @P1
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
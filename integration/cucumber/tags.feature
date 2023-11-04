@release1.1
@parentSuite("Other")
@epic("Cucumber")
Feature: duckduckgo.com
  Background:
    Given I visit site

  @suite("Suite")
  @subSuite("Child")
  Scenario: 01.1 should have suite,subsuite
    Given I log message "test with tag"

  @P1
  Scenario: 01 should have tag
    Given I log message "test with tag"

  @issue("ABC-454")
  Scenario: 02 should have issue tag
    Given I log message "test with issue"

  @issue("ABC-454","issue__link__description")
  Scenario: 03 should have issue tag with description
    Given I log message "test"

  @issue("ABC-123")
  @issue("ABC-456")
  Scenario: 04 should have several issue tags
    Given I log message "test"

  @tms("ABC-454")
  Scenario: 05 should have tms tag
    Given I log message "test with issue"

  @tms("ABC-454","issue__link__description")
  Scenario: 06 should have tms tag with description
    Given I log message "test"

  @tms("ABC-123")
  @tms("ABC-456")
  Scenario: 07 should have several tms tags
    Given I log message "test"

  @link("https://example.com")
  Scenario: 08 should have link tag
    Given I log message "test with issue"

  @link("https://example.com","example__text")
  Scenario: 09 should have link tag with text
    Given I log message "test with issue"

  @link("https://example.com","example__text","issue")
  Scenario: 10 should have link tag with text and 'issue' type
    Given I log message "test with issue"

  @link("https://example.com","example__text","tms")
  Scenario: 11 should have link tag with text and 'tms' type
    Given I log message "test with issue"

  @feature("Tags")
  @story("Special__tags")
  Scenario: 12 should have epic/feature/story tag
    Given I log message "test with issue"


  @severity("minor")
  @owner("T__P")
  @fullName("Full__name")
  @allureId("123")
  @language("javascript")
  @thread("01")
  @lead("AP")
  @host("MACBOOK")
  @layer("API")
  @browser("Chrome")
  @device("COMP")
  @os("MAC")
  @label("path","value")
  Scenario: 13 should have meta - severity,owner,etc
    Given I log message "test with issue"

  Scenario Outline: 14 with examples
    Then I should see a search bar "<text>"
    @simple
    Examples:
      | text  |
      | hello |

    @complex
    Examples:
      | text  |
      | bye   |
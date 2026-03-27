import type { ComponentReport, Issue } from '../types';
import { auditLogger } from '../logger';
import { glob } from 'glob';
import * as fs from 'fs/promises';

interface I18nReport {
  arabicSupport: {
    hasArabicContent: boolean;
    arabicTextFiles: string[];
    missingArabicTranslations: Array<{
      file: string;
      line: number;
      text: string;
    }>;
  };
  englishSupport: {
    hasEnglishContent: boolean;
    englishTextFiles: string[];
    missingEnglishTranslations: Array<{
      file: string;
      line: number;
      text: string;
    }>;
  };
  rtlLayout: {
    hasRTLSupport: boolean;
    rtlFiles: string[];
    missingRTLStyles: Array<{
      file: string;
      line: number;
      component: string;
    }>;
  };
  ltrLayout: {
    hasLTRSupport: boolean;
    ltrFiles: string[];
  };
  translatableText: {
    totalTextElements: number;
    hardcodedText: Array<{
      file: string;
      line: number;
      text: string;
    }>;
    translatableElements: number;
  };
  languageSwitcher: {
    exists: boolean;
    location?: string;
    functional: boolean;
  };
}

interface UXFlowReport {
  firstTimeUserExperience: {
    hasOnboarding: boolean;
    onboardingSteps: string[];
    isHelpful: boolean;
  };
  navigation: {
    isIntuitive: boolean;
    navigationIssues: Array<{
      file: string;
      issue: string;
      recommendation: string;
    }>;
  };
  loadingStates: {
    hasLoadingStates: boolean;
    loadingComponents: string[];
    missingLoadingStates: Array<{
      file: string;
      component: string;
    }>;
  };
  errorMessages: {
    hasUserFriendlyErrors: boolean;
    errorComponents: string[];
    poorErrorMessages: Array<{
      file: string;
      line: number;
      message: string;
      recommendation: string;
    }>;
  };
}

export class I18nUXAuditor {
  async run(): Promise<ComponentReport> {
    auditLogger.info('I18nUXAuditor', 'Starting i18n and UX audit');
    const startTime = Date.now();
    const issues: Issue[] = [];

    try {
      // Scan i18n implementation
      const i18nReport = await this.scanI18nImplementation();
      issues.push(...this.convertI18nToIssues(i18nReport));

      // Scan UX flows
      const uxReport = await this.scanUXFlows();
      issues.push(...this.convertUXToIssues(uxReport));

      const status = issues.some(i => i.severity === 'critical') ? 'fail' :
                     issues.some(i => i.severity === 'high') ? 'warning' : 'pass';

      return {
        component: 'I18nUXAuditor',
        status,
        issues,
        metrics: {
          arabicSupport: i18nReport.arabicSupport.hasArabicContent,
          englishSupport: i18nReport.englishSupport.hasEnglishContent,
          rtlSupport: i18nReport.rtlLayout.hasRTLSupport,
          ltrSupport: i18nReport.ltrLayout.hasLTRSupport,
          hardcodedTextCount: i18nReport.translatableText.hardcodedText.length,
          languageSwitcherExists: i18nReport.languageSwitcher.exists,
          hasOnboarding: uxReport.firstTimeUserExperience.hasOnboarding,
          hasLoadingStates: uxReport.loadingStates.hasLoadingStates,
          hasUserFriendlyErrors: uxReport.errorMessages.hasUserFriendlyErrors,
        },
        duration: Date.now() - startTime,
      };
    } catch (error) {
      auditLogger.error('I18nUXAuditor', 'Audit failed', { error });
      throw error;
    }
  }

  async scanI18nImplementation(): Promise<I18nReport> {
    auditLogger.info('I18nUXAuditor', 'Scanning i18n implementation');

    const arabicTextFiles: string[] = [];
    const englishTextFiles: string[] = [];
    const rtlFiles: string[] = [];
    const ltrFiles: string[] = [];
    const hardcodedText: Array<{ file: string; line: number; text: string }> = [];
    const missingRTLStyles: Array<{ file: string; line: number; component: string }> = [];

    const files = await glob('src/**/*.{ts,tsx,js,jsx}', {
      ignore: ['**/node_modules/**', '**/*.test.*', '**/*.spec.*']
    });

    // Arabic text pattern (matches Arabic Unicode range)
    const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
    
    // English text pattern (matches common English words in JSX)
    const englishPattern = /[A-Za-z]{3,}/;

    // RTL/LTR patterns
    const rtlPattern = /rtl|direction.*rtl|dir.*rtl|tailwindcss-rtl/i;
    const ltrPattern = /ltr|direction.*ltr|dir.*ltr/i;

    // Hardcoded text patterns (text in JSX without translation)
    const hardcodedPatterns = [
      /<[^>]+>([A-Za-z\u0600-\u06FF]{3,}[^<]*)<\/[^>]+>/g, // Text in JSX tags
      /placeholder=["']([^"']+)["']/g, // Placeholder text
      /title=["']([^"']+)["']/g, // Title attributes
      /aria-label=["']([^"']+)["']/g, // ARIA labels
    ];

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const lines = content.split('\n');

        // Check for Arabic content
        if (arabicPattern.test(content)) {
          arabicTextFiles.push(file);
        }

        // Check for English content
        if (englishPattern.test(content)) {
          englishTextFiles.push(file);
        }

        // Check for RTL support
        if (rtlPattern.test(content)) {
          rtlFiles.push(file);
        }

        // Check for LTR support
        if (ltrPattern.test(content)) {
          ltrFiles.push(file);
        }

        // Check for hardcoded text in components
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          // Skip imports, comments, and type definitions
          if (line.trim().startsWith('import') || 
              line.trim().startsWith('//') || 
              line.trim().startsWith('/*') ||
              line.trim().startsWith('*') ||
              line.includes('interface ') ||
              line.includes('type ')) {
            continue;
          }

          // Check for hardcoded text patterns
          for (const pattern of hardcodedPatterns) {
            const matches = line.matchAll(pattern);
            for (const match of matches) {
              const text = match[1];
              // Skip if it's a variable, prop, or short text
              if (text && text.length > 2 && !text.includes('{') && !text.startsWith('$')) {
                hardcodedText.push({
                  file,
                  line: i + 1,
                  text: text.substring(0, 50),
                });
              }
            }
          }
        }

        // Check for components that might need RTL support
        if (file.includes('component') || file.includes('page')) {
          const hasFlexbox = /flex|grid/i.test(content);
          const hasMarginPadding = /margin|padding|ml-|mr-|pl-|pr-/i.test(content);
          const hasRTL = rtlPattern.test(content);

          if ((hasFlexbox || hasMarginPadding) && !hasRTL) {
            // This component might need RTL consideration
            const componentName = file.split('/').pop()?.replace(/\.(tsx?|jsx?)$/, '') || 'unknown';
            missingRTLStyles.push({
              file,
              line: 1,
              component: componentName,
            });
          }
        }
      } catch (error) {
        auditLogger.warn('I18nUXAuditor', `Failed to scan file: ${file}`, { error });
      }
    }

    // Check for language switcher
    let languageSwitcherExists = false;
    let languageSwitcherLocation: string | undefined;
    
    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        if (/language.*switch|switch.*language|lang.*toggle|toggle.*lang/i.test(content)) {
          languageSwitcherExists = true;
          languageSwitcherLocation = file;
          break;
        }
      } catch (error) {
        // Continue checking other files
      }
    }

    return {
      arabicSupport: {
        hasArabicContent: arabicTextFiles.length > 0,
        arabicTextFiles,
        missingArabicTranslations: [],
      },
      englishSupport: {
        hasEnglishContent: englishTextFiles.length > 0,
        englishTextFiles,
        missingEnglishTranslations: [],
      },
      rtlLayout: {
        hasRTLSupport: rtlFiles.length > 0,
        rtlFiles,
        missingRTLStyles,
      },
      ltrLayout: {
        hasLTRSupport: ltrFiles.length > 0,
        ltrFiles,
      },
      translatableText: {
        totalTextElements: hardcodedText.length,
        hardcodedText,
        translatableElements: 0,
      },
      languageSwitcher: {
        exists: languageSwitcherExists,
        location: languageSwitcherLocation,
        functional: languageSwitcherExists, // Assume functional if exists
      },
    };
  }

  async scanUXFlows(): Promise<UXFlowReport> {
    auditLogger.info('I18nUXAuditor', 'Scanning UX flows');

    const onboardingSteps: string[] = [];
    const loadingComponents: string[] = [];
    const errorComponents: string[] = [];
    const navigationIssues: Array<{ file: string; issue: string; recommendation: string }> = [];
    const missingLoadingStates: Array<{ file: string; component: string }> = [];
    const poorErrorMessages: Array<{ file: string; line: number; message: string; recommendation: string }> = [];

    const files = await glob('src/**/*.{ts,tsx,js,jsx}', {
      ignore: ['**/node_modules/**', '**/*.test.*', '**/*.spec.*']
    });

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const lines = content.split('\n');

        // Check for onboarding
        if (/onboard|welcome|tutorial|intro|first.*time/i.test(content)) {
          onboardingSteps.push(file);
        }

        // Check for loading states
        if (/loading|isLoading|spinner|skeleton|loader/i.test(content)) {
          loadingComponents.push(file);
        }

        // Check for error handling
        if (/error|Error|catch|try.*catch/i.test(content)) {
          errorComponents.push(file);
        }

        // Check for async operations without loading states
        const hasAsync = /async|await|\.then\(|useQuery|useMutation/i.test(content);
        const hasLoading = /loading|isLoading|isPending/i.test(content);
        
        if (hasAsync && !hasLoading && (file.includes('component') || file.includes('page'))) {
          const componentName = file.split('/').pop()?.replace(/\.(tsx?|jsx?)$/, '') || 'unknown';
          missingLoadingStates.push({
            file,
            component: componentName,
          });
        }

        // Check for poor error messages
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          // Look for generic error messages
          const genericErrors = [
            'Error',
            'Something went wrong',
            'An error occurred',
            'Failed',
            'error',
          ];

          for (const genericError of genericErrors) {
            if (line.includes(`"${genericError}"`) || line.includes(`'${genericError}'`)) {
              poorErrorMessages.push({
                file,
                line: i + 1,
                message: genericError,
                recommendation: 'Provide specific, actionable error message that guides user to solution',
              });
            }
          }
        }

        // Check for navigation issues
        if (file.includes('nav') || file.includes('menu') || file.includes('header')) {
          const hasAccessibleNav = /nav|navigation|menu|aria-label|role="navigation"/i.test(content);
          const hasKeyboardNav = /onKeyDown|onKeyPress|tabIndex/i.test(content);
          
          if (hasAccessibleNav && !hasKeyboardNav) {
            navigationIssues.push({
              file,
              issue: 'Navigation lacks keyboard support',
              recommendation: 'Add keyboard navigation support (Tab, Enter, Arrow keys)',
            });
          }
        }

        // Additional UX checks for task 21.4
        
        // Check for empty states
        const hasEmptyState = /empty.*state|no.*data|no.*results|nothing.*found/i.test(content);
        const hasEmptyAction = hasEmptyState && /button|link|action|cta/i.test(content);
        
        if (hasEmptyState && !hasEmptyAction && (file.includes('component') || file.includes('page'))) {
          navigationIssues.push({
            file,
            issue: 'Empty state may lack actionable guidance',
            recommendation: 'Add call-to-action or guidance in empty states',
          });
        }

        // Check for form usability
        if (/form|input|textarea|select/i.test(content)) {
          const hasLabels = /label|aria-label|placeholder/i.test(content);
          const hasValidation = /error|invalid|validate|required/i.test(content);
          
          if (!hasLabels) {
            navigationIssues.push({
              file,
              issue: 'Form inputs may lack labels',
              recommendation: 'Add labels or aria-labels to all form inputs',
            });
          }
          
          if (!hasValidation) {
            navigationIssues.push({
              file,
              issue: 'Form may lack validation feedback',
              recommendation: 'Add validation messages to guide users',
            });
          }
        }

        // Check for button clarity
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          // Look for unclear button text
          const unclearButtons = [
            'Click here',
            'Submit',
            'OK',
            'Cancel',
            'Yes',
            'No',
          ];

          for (const unclearText of unclearButtons) {
            if (line.includes(`>${unclearText}<`) || line.includes(`"${unclearText}"`)) {
              navigationIssues.push({
                file,
                issue: `Unclear button text: "${unclearText}"`,
                recommendation: 'Use descriptive button text that explains the action',
              });
              break; // Only report once per file
            }
          }
        }
      } catch (error) {
        auditLogger.warn('I18nUXAuditor', `Failed to scan file: ${file}`, { error });
      }
    }

    return {
      firstTimeUserExperience: {
        hasOnboarding: onboardingSteps.length > 0,
        onboardingSteps,
        isHelpful: onboardingSteps.length > 0, // Assume helpful if exists
      },
      navigation: {
        isIntuitive: navigationIssues.length === 0,
        navigationIssues,
      },
      loadingStates: {
        hasLoadingStates: loadingComponents.length > 0,
        loadingComponents,
        missingLoadingStates,
      },
      errorMessages: {
        hasUserFriendlyErrors: poorErrorMessages.length === 0,
        errorComponents,
        poorErrorMessages,
      },
    };
  }

  private convertI18nToIssues(report: I18nReport): Issue[] {
    const issues: Issue[] = [];

    // Arabic support
    if (!report.arabicSupport.hasArabicContent) {
      issues.push({
        severity: 'high',
        category: 'i18n',
        description: 'No Arabic language support detected',
        autoFixable: false,
        recommendation: 'Implement Arabic translations for all UI text',
      });
    }

    // English support
    if (!report.englishSupport.hasEnglishContent) {
      issues.push({
        severity: 'medium',
        category: 'i18n',
        description: 'Limited English language support detected',
        autoFixable: false,
        recommendation: 'Add English translations for better international reach',
      });
    }

    // RTL layout
    if (!report.rtlLayout.hasRTLSupport) {
      issues.push({
        severity: 'high',
        category: 'i18n',
        description: 'No RTL layout support detected for Arabic',
        autoFixable: false,
        recommendation: 'Implement RTL layout support using tailwindcss-rtl or CSS direction property',
      });
    }

    // Missing RTL styles in components
    report.rtlLayout.missingRTLStyles.forEach(item => {
      issues.push({
        severity: 'medium',
        category: 'i18n',
        description: `Component '${item.component}' may need RTL layout consideration`,
        file: item.file,
        line: item.line,
        autoFixable: false,
        recommendation: 'Review component layout for RTL support (margins, padding, flex direction)',
      });
    });

    // Hardcoded text
    if (report.translatableText.hardcodedText.length > 0) {
      // Report summary instead of individual items to avoid too many issues
      issues.push({
        severity: 'medium',
        category: 'i18n',
        description: `Found ${report.translatableText.hardcodedText.length} instances of hardcoded text`,
        autoFixable: false,
        recommendation: 'Move hardcoded text to translation files or constants',
      });

      // Report first few examples
      report.translatableText.hardcodedText.slice(0, 5).forEach(item => {
        issues.push({
          severity: 'low',
          category: 'i18n',
          description: `Hardcoded text: "${item.text}"`,
          file: item.file,
          line: item.line,
          autoFixable: false,
          recommendation: 'Extract to translation file or constant',
        });
      });
    }

    // Language switcher
    if (!report.languageSwitcher.exists) {
      issues.push({
        severity: 'high',
        category: 'i18n',
        description: 'No language switcher found',
        autoFixable: false,
        recommendation: 'Implement language switcher component to allow users to change language',
      });
    }

    return issues;
  }

  private convertUXToIssues(report: UXFlowReport): Issue[] {
    const issues: Issue[] = [];

    // Onboarding
    if (!report.firstTimeUserExperience.hasOnboarding) {
      issues.push({
        severity: 'medium',
        category: 'ux',
        description: 'No onboarding flow detected for first-time users',
        autoFixable: false,
        recommendation: 'Implement onboarding to guide new users through key features',
      });
    }

    // Navigation issues
    report.navigation.navigationIssues.forEach(item => {
      issues.push({
        severity: 'medium',
        category: 'ux',
        description: item.issue,
        file: item.file,
        autoFixable: false,
        recommendation: item.recommendation,
      });
    });

    // Missing loading states
    report.loadingStates.missingLoadingStates.forEach(item => {
      issues.push({
        severity: 'low',
        category: 'ux',
        description: `Component '${item.component}' has async operations but no loading state`,
        file: item.file,
        autoFixable: false,
        recommendation: 'Add loading state to inform users while data is being fetched',
      });
    });

    // Poor error messages
    report.errorMessages.poorErrorMessages.forEach(item => {
      issues.push({
        severity: 'medium',
        category: 'ux',
        description: `Generic error message: "${item.message}"`,
        file: item.file,
        line: item.line,
        autoFixable: false,
        recommendation: item.recommendation,
      });
    });

    return issues;
  }
}
